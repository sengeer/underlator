function stringifyGenerateResponse(
  generatedResponse: string | Record<number, string>
) {
  return typeof generatedResponse === 'string'
    ? generatedResponse
    : JSON.stringify(generatedResponse);
}

export default stringifyGenerateResponse;
