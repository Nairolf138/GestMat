import { useEffect, useRef } from 'react';
import { showToast } from './toast';

function Alert({ message, type = 'danger', autoHideDuration = 4000, onClose }) {
  const onCloseRef = useRef(onClose);
  const messageRef = useRef(message);
  onCloseRef.current = onClose;
  messageRef.current = message;

  useEffect(() => {
    if (message) {
      showToast(message, type, {
        duration: autoHideDuration,
        onClose: () => {
          if (messageRef.current === message) onCloseRef.current?.();
        },
      });
    }
  }, [message, type, autoHideDuration]);

  return null;
}

export default Alert;
