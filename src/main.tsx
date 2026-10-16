import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix Google Translate / browser extensions breaking React DOM reconciler (NotFoundError: removeChild)
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('DOM child removed by external extension or Google Translate, safely skipping reconciler crash.', child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('DOM reference node modified by external extension or Google Translate, safely skipping reconciler crash.', referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments as any) as T;
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
