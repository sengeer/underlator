import { Trans } from '@lingui/react/macro';
import './index.scss';

function CustomErrorMessage() {
  return (
    <div className='custom-error-message'>
      <Trans>failed to load PDF file</Trans>
    </div>
  );
}

export default CustomErrorMessage;
