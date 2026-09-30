import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// 원본 index.html의 CSS. (src/index.css는 기존 시안(src/legacy/DraftApp.tsx)용 Tailwind CSS라 실제 화면에는 사용하지 않는다)
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
