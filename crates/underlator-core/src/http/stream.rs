//! Потоковые адаптеры: raw/chunked байты, newline-delimited кадры и SSE.

use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;

use bytes::{Bytes, BytesMut};
use futures_util::Stream;

use crate::error::CoreError;

/// Режим разбора тела потокового ответа.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamMode {
    /// Отдавать фрагменты тела как есть, без JSON-парсинга.
    Raw,
    /// Кадры по `\n`, пустые строки отбрасываются; `serde_json` на кадре не вызывается.
    NdJson,
    /// Полезная нагрузка SSE-событий (`data:`).
    Sse,
}

/// Инкрементальный декодер кадров. Буфер хранит только незакрытый хвост.
pub(crate) struct FrameDecoder {
    mode: StreamMode,
    buf: BytesMut,
}

impl FrameDecoder {
    pub(crate) fn new(mode: StreamMode) -> Self {
        Self {
            mode,
            buf: BytesMut::new(),
        }
    }

    pub(crate) fn mode(&self) -> StreamMode {
        self.mode
    }

    pub(crate) fn push(&mut self, data: &[u8]) {
        self.buf.extend_from_slice(data);
    }

    /// Следующий полный кадр или `None`, если в буфере только незакрытый хвост.
    pub(crate) fn next_frame(&mut self) -> Option<Bytes> {
        match self.mode {
            StreamMode::Raw => {
                if self.buf.is_empty() {
                    None
                } else {
                    Some(self.buf.split().freeze())
                }
            }
            StreamMode::NdJson => next_ndjson_frame(&mut self.buf),
            StreamMode::Sse => next_sse_frame(&mut self.buf),
        }
    }

    /// Хвост без завершающего разделителя в конце потока.
    pub(crate) fn finish(&mut self) -> Option<Bytes> {
        if self.buf.is_empty() {
            return None;
        }
        match self.mode {
            StreamMode::Raw => Some(self.buf.split().freeze()),
            StreamMode::NdJson => {
                let rest = self.buf.split().freeze();
                if rest.iter().all(u8::is_ascii_whitespace) {
                    None
                } else {
                    Some(trim_cr(rest))
                }
            }
            StreamMode::Sse => {
                if let Some(frame) = next_sse_frame(&mut self.buf) {
                    Some(frame)
                } else if self.buf.is_empty() {
                    None
                } else {
                    let rest = self.buf.split().freeze();
                    parse_sse_event(&rest)
                }
            }
        }
    }
}

fn next_ndjson_frame(buf: &mut BytesMut) -> Option<Bytes> {
    loop {
        let pos = buf.iter().position(|&b| b == b'\n')?;
        let mut line = buf.split_to(pos + 1);
        line.truncate(line.len() - 1);
        if line.last() == Some(&b'\r') {
            line.truncate(line.len() - 1);
        }
        if line.iter().all(u8::is_ascii_whitespace) {
            continue;
        }
        return Some(line.freeze());
    }
}

fn trim_cr(bytes: Bytes) -> Bytes {
    if bytes.last() == Some(&b'\r') {
        Bytes::copy_from_slice(&bytes[..bytes.len() - 1])
    } else {
        bytes
    }
}

fn find_sse_event_end(buf: &[u8]) -> Option<usize> {
    let mut i = 0;
    while i < buf.len() {
        if buf[i] == b'\n' && i + 1 < buf.len() && buf[i + 1] == b'\n' {
            return Some(i + 2);
        }
        if buf[i] == b'\r'
            && i + 3 < buf.len()
            && buf[i + 1] == b'\n'
            && buf[i + 2] == b'\r'
            && buf[i + 3] == b'\n'
        {
            return Some(i + 4);
        }
        i += 1;
    }
    None
}

fn next_sse_frame(buf: &mut BytesMut) -> Option<Bytes> {
    loop {
        let end = find_sse_event_end(buf)?;
        let event = buf.split_to(end).freeze();
        if let Some(payload) = parse_sse_event(&event) {
            return Some(payload);
        }
    }
}

fn parse_sse_event(event: &[u8]) -> Option<Bytes> {
    let text = std::str::from_utf8(event).ok()?;
    let mut data_parts: Vec<&str> = Vec::new();
    for raw_line in text.split('\n') {
        let line = raw_line.trim_end_matches('\r');
        if line.is_empty() || line.starts_with(':') {
            continue;
        }
        if let Some(rest) = line.strip_prefix("data:") {
            let payload = rest.strip_prefix(' ').unwrap_or(rest);
            data_parts.push(payload);
        }
    }
    if data_parts.is_empty() {
        return None;
    }
    Some(Bytes::from(data_parts.join("\n")))
}

/// Поток кадров HTTP-ответа. Drop отменяет чтение тела.
pub struct HttpByteStream {
    inner: DecodingStream,
}

impl HttpByteStream {
    pub(crate) fn from_byte_stream<S>(incoming: S, mode: StreamMode, idle_timeout: Duration) -> Self
    where
        S: Stream<Item = Result<Bytes, reqwest::Error>> + Send + 'static,
    {
        Self {
            inner: DecodingStream {
                incoming: Box::pin(incoming),
                decoder: FrameDecoder::new(mode),
                idle_timeout,
                idle: None,
                first_delivered: false,
                incoming_done: false,
                failed: false,
            },
        }
    }
}

impl Stream for HttpByteStream {
    type Item = Result<Bytes, CoreError>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        Pin::get_mut(self).inner.poll_next(cx)
    }
}

struct DecodingStream {
    incoming: Pin<Box<dyn Stream<Item = Result<Bytes, reqwest::Error>> + Send>>,
    decoder: FrameDecoder,
    idle_timeout: Duration,
    idle: Option<Pin<Box<tokio::time::Sleep>>>,
    first_delivered: bool,
    incoming_done: bool,
    failed: bool,
}

impl DecodingStream {
    fn arm_idle(&mut self) {
        self.idle = Some(Box::pin(tokio::time::sleep(self.idle_timeout)));
    }

    fn map_incoming_error(&self, err: reqwest::Error) -> CoreError {
        if self.first_delivered {
            CoreError::HttpStream(err.to_string())
        } else {
            super::map_reqwest(err)
        }
    }

    fn idle_error(&self) -> CoreError {
        if self.first_delivered {
            CoreError::HttpStream("превышен idle-timeout потока".to_owned())
        } else {
            CoreError::HttpTimeout
        }
    }

    fn poll_next(&mut self, cx: &mut Context<'_>) -> Poll<Option<Result<Bytes, CoreError>>> {
        if self.idle.is_none() && !self.incoming_done && !self.failed {
            self.arm_idle();
        }

        loop {
            if self.failed {
                return Poll::Ready(None);
            }

            if let Some(frame) = self.decoder.next_frame() {
                self.first_delivered = true;
                self.arm_idle();
                return Poll::Ready(Some(Ok(frame)));
            }

            if self.incoming_done {
                if let Some(frame) = self.decoder.finish() {
                    self.first_delivered = true;
                    return Poll::Ready(Some(Ok(frame)));
                }
                return Poll::Ready(None);
            }

            if let Some(sleep) = self.idle.as_mut()
                && sleep.as_mut().poll(cx).is_ready()
            {
                self.failed = true;
                return Poll::Ready(Some(Err(self.idle_error())));
            }

            match self.incoming.as_mut().poll_next(cx) {
                Poll::Ready(Some(Ok(chunk))) => {
                    self.arm_idle();
                    if self.decoder.mode() == StreamMode::Raw {
                        if chunk.is_empty() {
                            continue;
                        }
                        self.first_delivered = true;
                        return Poll::Ready(Some(Ok(chunk)));
                    }
                    self.decoder.push(&chunk);
                }
                Poll::Ready(Some(Err(err))) => {
                    self.failed = true;
                    return Poll::Ready(Some(Err(self.map_incoming_error(err))));
                }
                Poll::Ready(None) => {
                    self.incoming_done = true;
                }
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ndjson_yields_first_frame_before_eof() {
        let mut decoder = FrameDecoder::new(StreamMode::NdJson);
        decoder.push(
            br#"{"a":1}
{"b":2}"#,
        );
        let first = decoder.next_frame().expect("первый кадр до EOF");
        assert_eq!(first.as_ref(), br#"{"a":1}"#);
        assert!(decoder.next_frame().is_none(), "второй кадр ещё без \\n");
        let second = decoder.finish().expect("хвост на EOF");
        assert_eq!(second.as_ref(), br#"{"b":2}"#);
    }

    #[test]
    fn ndjson_skips_empty_lines_without_json_parse() {
        let mut decoder = FrameDecoder::new(StreamMode::NdJson);
        decoder.push(b"not-json\n\n{\"ok\":true}\n");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), b"not-json");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), br#"{"ok":true}"#);
        assert!(decoder.next_frame().is_none());
    }

    #[test]
    fn sse_yields_data_payloads() {
        let mut decoder = FrameDecoder::new(StreamMode::Sse);
        decoder.push(b"data: one\n\ndata: two\n\n");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), b"one");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), b"two");
        assert!(decoder.next_frame().is_none());
    }

    #[test]
    fn raw_yields_chunks_without_json() {
        let mut decoder = FrameDecoder::new(StreamMode::Raw);
        decoder.push(b"abc");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), b"abc");
        decoder.push(b"{not json");
        assert_eq!(decoder.next_frame().unwrap().as_ref(), b"{not json");
    }
}
