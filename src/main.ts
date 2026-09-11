import './style.css';
import { Game } from './game/Game';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('Game container not found!');
    return;
  }

  const game = new Game(container);
  (window as any).__BLAST_GAME__ = game;
  game.init().then(() => {
    if (window.location.search.includes('test_move=1')) {
      // Simulate moving towards the camera to capture mid-stride leg articulation
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      setTimeout(() => {
        const dataUrl = (game as any).renderer.domElement.toDataURL('image/png');
        fetch('http://localhost:9998/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl })
        }).catch(err => console.error('Screenshot upload failed:', err));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
      }, 350);
    } else if (window.location.search.includes('capture_modal=1')) {
      (game as any).ui.showStateModal('PAUSED');
      setTimeout(async () => {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#080b11',
          });
          const webglCanvas = (game as any).renderer.domElement;
          const composite = document.createElement('canvas');
          composite.width = canvas.width;
          composite.height = canvas.height;
          const ctx = composite.getContext('2d');
          if (ctx && webglCanvas) {
            ctx.drawImage(webglCanvas, 0, 0, composite.width, composite.height);
            ctx.drawImage(canvas, 0, 0);
            fetch('http://localhost:9998/screenshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: composite.toDataURL('image/png') })
            });
          }
        } catch (err) {
          console.error('Failed modal screenshot:', err);
        }
      }, 800);
    } else if (window.location.search.includes('capture_full=1')) {
      setTimeout(async () => {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#080b11',
          });
          const webglCanvas = (game as any).renderer.domElement;
          const composite = document.createElement('canvas');
          composite.width = canvas.width;
          composite.height = canvas.height;
          const ctx = composite.getContext('2d');
          if (ctx && webglCanvas) {
            ctx.drawImage(webglCanvas, 0, 0, composite.width, composite.height);
            ctx.drawImage(canvas, 0, 0);
            fetch('http://localhost:9998/screenshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: composite.toDataURL('image/png') })
            });
          }
        } catch (err) {
          console.error('Failed full screenshot:', err);
        }
      }, 800);
    } else if (window.location.search.includes('capture=1')) {
      setTimeout(() => {
        const dataUrl = (game as any).renderer.domElement.toDataURL('image/png');
        fetch('http://localhost:9998/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl })
        }).catch(err => console.error('Screenshot upload failed:', err));
      }, 1000);
    }
  }).catch((err) => {
    console.error('Failed to initialize Blast Grid:', err);
  });
});
