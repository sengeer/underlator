import PdfViewer from '../../widgets/pdf-viewer';
import TextTranslator from '../../widgets/text-translator';

function Main() {
  return (
    <main>
      <h2>Многоязычный перевод с помощью машинного обучения!</h2>

      <TextTranslator />
      <PdfViewer />
    </main>
  );
}

export default Main;
