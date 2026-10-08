import * as THREE from 'three';

// Fallback image path constants generated in turn 1
export const PARCHMENT_TEXTURE_PATH = '/src/assets/images/doodle_parchment_texture_1790899621436.jpg';
export const GAME_COVER_PATH = '/src/assets/images/sketchbook_game_cover_1790899635334.jpg';
export const HUNTER_PORTRAIT_PATH = '/src/assets/images/hunter_doodle_portrait_1790899647143.jpg';
export const SURVIVOR_CREW_PATH = '/src/assets/images/survivor_crew_sketch_1790899658703.jpg';

/**
 * Creates a procedural doodle paper texture with faint graphite grid & pencil smudges
 */
export function createParchmentCanvasTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Warm aged notebook paper tone
    ctx.fillStyle = '#efe7d8';
    ctx.fillRect(0, 0, size, size);

    // Faint blue rule lines like school notebook paper
    ctx.strokeStyle = 'rgba(75, 115, 155, 0.18)';
    ctx.lineWidth = 1.5;
    const lineStep = 32;
    for (let y = lineStep; y < size; y += lineStep) {
      ctx.beginPath();
      let x = 0;
      let curY = y;
      ctx.moveTo(x, curY);
      while (x < size) {
        x += 20;
        curY = y + (Math.random() - 0.5) * 1.5;
        ctx.lineTo(x, curY);
      }
      ctx.stroke();
    }

    // Red margin line
    ctx.strokeStyle = 'rgba(210, 60, 60, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 0);
    ctx.lineTo(48, size);
    ctx.stroke();

    // Graphite pencil scribbles and grain
    ctx.fillStyle = 'rgba(40, 35, 30, 0.04)';
    for (let i = 0; i < 4000; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      ctx.fillRect(px, py, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5);
    }

    // Pencil crosshatching patches
    ctx.strokeStyle = 'rgba(30, 25, 20, 0.08)';
    ctx.lineWidth = 1;
    for (let p = 0; p < 8; p++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      for (let l = 0; l < 12; l++) {
        ctx.beginPath();
        ctx.moveTo(cx + l * 4 - 20, cy - 20);
        ctx.lineTo(cx + l * 4 + 20, cy + 20);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates glowing red/ink scratch marks left by sprinting survivors
 */
export function createScratchMarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // 3 frantic jagged claw lines (bright red ink doodle)
    ctx.strokeStyle = '#e62e2d';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 8;

    for (let c = 0; c < 3; c++) {
      ctx.beginPath();
      const startX = 30 + c * 32;
      ctx.moveTo(startX, 15);
      ctx.lineTo(startX + (Math.random() - 0.5) * 16, 50);
      ctx.lineTo(startX + (Math.random() - 0.5) * 20, 85);
      ctx.lineTo(startX + (Math.random() - 0.5) * 10, 115);
      ctx.stroke();
    }

    // Dark charcoal splatters
    ctx.fillStyle = '#6b0f0f';
    for (let s = 0; s < 12; s++) {
      ctx.beginPath();
      ctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates comic action word sprite ("BAM!", "WHOOSH!", "STUNNED!", "REPAIRED!")
 */
export function createComicActionSprite(text: string, color = '#e62e2d'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 256, 128);

    // Comic speech burst / jagged star polygon
    ctx.save();
    ctx.translate(128, 64);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1a1614';
    ctx.lineWidth = 4;

    const spikes = 12;
    const outerRadius = 55;
    const innerRadius = 38;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.7;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Handwritten heavy action text
    ctx.font = 'bold 32px "Patrick Hand", "Architects Daughter", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    // Black stroke on text
    ctx.strokeStyle = '#1a1614';
    ctx.lineWidth = 1.5;
    ctx.strokeText(text, 0, 0);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3, 1.5, 1);
  return sprite;
}

/**
 * Creates inverted hull black ink outline mesh
 * Scales geometry slightly along normals and renders back-faces in solid ink black
 */
export function createInkOutlineMesh(geometry: THREE.BufferGeometry, outlineThickness = 0.04): THREE.Mesh {
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x141210,
    side: THREE.BackSide,
  });

  const outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
  outlineMesh.scale.multiplyScalar(1 + outlineThickness);
  return outlineMesh;
}
