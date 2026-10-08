import * as THREE from 'three';
import { SurvivorClass, HunterClass, MapId } from '../types/game';
import { createParchmentCanvasTexture } from './textures';

// Helper material for doodle paper models
function getDoodleMaterial(colorHex: number, roughness = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: roughness,
    metalness: 0.05,
    flatShading: true,
  });
}

// Inverted hull helper
function addInkOutline(parent: THREE.Object3D, geometry: THREE.BufferGeometry, scale = 1.05) {
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x181412,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(geometry, outlineMat);
  outline.scale.set(scale, scale, scale);
  parent.add(outline);
}

export interface AnimatedCharacterRig {
  root: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  heldItem: THREE.Group;
  flashlightBeam?: THREE.SpotLight;
  flashlightMesh?: THREE.Mesh;
  redStain?: THREE.Mesh;
  forcefieldMesh?: THREE.Mesh;
  setTransparency?: (opacity: number) => void;
  setRagingEyes?: (active: boolean) => void;
  setGamblerHat?: (hat: 'dimmadome' | 'top_hat' | 'fedora' | 'beanie') => void;
  setForcefieldActive?: (active: boolean) => void;
  updateForcefield?: (time: number) => void;
  setHitboxVisible?: (visible: boolean) => void;
  updateAnimation: (time: number, isMoving: boolean, isSprinting: boolean, isCrouching: boolean, isVaulting: boolean, action?: string | null) => void;
}

/**
 * Builds an expressive 3D doodle Survivor rig
 */
export function createSurvivorModel(role: SurvivorClass): AnimatedCharacterRig {
  const root = new THREE.Group();

  // Role color accents
  let shirtColor = 0xe2d7c5; // neutral parchment
  let pantsColor = 0x272e38;
  let headSkinColor = 0xfcf7ed;

  if (role === 'newb') {
    shirtColor = 0x1d70b8; // classic blue shirt
    pantsColor = 0x2e8540; // classic green pants
    headSkinColor = 0xf4d03f; // classic doodle yellow
  } else if (role === 'caretaker') {
    shirtColor = 0x242220; // dark caretaker trenchcoat
    pantsColor = 0x543d2b; // classic Roblox Forsaken Caretaker brown pants
    headSkinColor = 0xfcf7ed;
  } else if (role === 'builda_men') {
    shirtColor = 0xf5a623; // builderman orange/yellow shirt
    pantsColor = 0x1b3b6f; // blue denim
    headSkinColor = 0xf4d03f;
  } else if (role === 'gambling_guy') {
    shirtColor = 0x1b4332; // green velvet vest
    pantsColor = 0x222222;
    headSkinColor = 0xfcf7ed;
  } else if (role === 'protector_guy') {
    shirtColor = 0x2b2d42; // protector athletic navy
    pantsColor = 0x1d2d44;
    headSkinColor = 0xeddcd2;
  }

  // 1. Torso
  const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
  const torsoMat = getDoodleMaterial(shirtColor);
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.35;
  torso.castShadow = true;
  root.add(torso);
  addInkOutline(torso, torsoGeo, 1.08);

  // Caretaker full medical apron, stethoscope, and red cross
  if (role === 'caretaker') {
    const apronGeo = new THREE.BoxGeometry(0.72, 0.88, 0.48);
    const apronMat = getDoodleMaterial(0xfdfbf7, 0.7);
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.y = 0;
    torso.add(apron);
    addInkOutline(apron, apronGeo, 1.05);

    // Red Cross emblem on chest pocket
    const redMat = getDoodleMaterial(0xd90429);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.03), redMat);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.03), redMat);
    crossH.position.set(0.18, 0.16, 0.26);
    crossV.position.set(0.18, 0.16, 0.26);
    torso.add(crossH);
    torso.add(crossV);

    // Stethoscope loop around neck
    const stethGeo = new THREE.TorusGeometry(0.18, 0.025, 4, 12, Math.PI * 1.3);
    const stethMat = getDoodleMaterial(0x1a1614);
    const steth = new THREE.Mesh(stethGeo, stethMat);
    steth.position.set(0, 0.38, 0.22);
    steth.rotation.x = Math.PI / 3;
    torso.add(steth);
  } else if (role === 'builda_men') {
    const beltGeo = new THREE.BoxGeometry(0.76, 0.12, 0.48);
    const belt = new THREE.Mesh(beltGeo, getDoodleMaterial(0x8b5a2b));
    belt.position.set(0, -0.38, 0);
    torso.add(belt);
  }

  // Backpack / Satchel
  const packGeo = new THREE.BoxGeometry(0.48, 0.55, 0.25);
  const packMat = getDoodleMaterial(0x524636);
  const pack = new THREE.Mesh(packGeo, packMat);
  pack.position.set(0, 0.05, -0.32);
  torso.add(pack);
  addInkOutline(pack, packGeo, 1.1);

  // 2. Head Group
  const head = new THREE.Group();
  head.position.set(0, 0.75, 0);
  torso.add(head);

  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.55);
  const headMat = getDoodleMaterial(headSkinColor);
  const headMesh = new THREE.Mesh(headGeo, headMat);
  head.add(headMesh);
  addInkOutline(headMesh, headGeo, 1.08);

  // Sketched face features (Doodle button eyes + big happy smile)
  const eyeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8);
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x151210 });

  const leftEye = new THREE.Mesh(eyeGeo, inkMat);
  leftEye.rotation.x = Math.PI / 2;
  leftEye.position.set(-0.16, 0.08, 0.28);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, inkMat);
  rightEye.rotation.x = Math.PI / 2;
  rightEye.position.set(0.16, 0.08, 0.28);
  head.add(rightEye);

  // Smile
  const smileGeo = new THREE.TorusGeometry(0.12, 0.02, 4, 8, Math.PI);
  const smile = new THREE.Mesh(smileGeo, inkMat);
  smile.position.set(0, -0.08, 0.28);
  smile.rotation.x = Math.PI;
  head.add(smile);

  // Dynamic Hat Group for Gambling Guy & Role headwear
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, 0.3, 0);
  head.add(hatGroup);

  const buildGamblerHat = (hatType: 'dimmadome' | 'top_hat' | 'fedora' | 'beanie') => {
    while (hatGroup.children.length > 0) hatGroup.remove(hatGroup.children[0]);

    if (hatType === 'dimmadome') {
      // Dimmadome's legendary ultra-tall white cowboy hat (1.6m tall!)
      const brimGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.06, 12);
      const brim = new THREE.Mesh(brimGeo, getDoodleMaterial(0xffffff));
      hatGroup.add(brim);

      const tallGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.8, 10);
      const tall = new THREE.Mesh(tallGeo, getDoodleMaterial(0xffffff));
      tall.position.y = 0.9;
      hatGroup.add(tall);
      addInkOutline(tall, tallGeo, 1.05);
    } else if (hatType === 'top_hat') {
      // Black top hat
      const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10);
      const brim = new THREE.Mesh(brimGeo, getDoodleMaterial(0x1a1614));
      hatGroup.add(brim);

      const topGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.6, 10);
      const top = new THREE.Mesh(topGeo, getDoodleMaterial(0x1a1614));
      top.position.y = 0.32;
      hatGroup.add(top);
      addInkOutline(top, topGeo, 1.06);
    } else if (hatType === 'fedora') {
      // Fedora
      const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10);
      const brim = new THREE.Mesh(brimGeo, getDoodleMaterial(0x4a3728));
      hatGroup.add(brim);

      const crownGeo = new THREE.ConeGeometry(0.36, 0.35, 6);
      const crown = new THREE.Mesh(crownGeo, getDoodleMaterial(0x4a3728));
      crown.position.y = 0.2;
      hatGroup.add(crown);
    } else {
      // Beanie
      const beanieGeo = new THREE.SphereGeometry(0.38, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const beanie = new THREE.Mesh(beanieGeo, getDoodleMaterial(0xe07a5f));
      beanie.position.y = 0.05;
      hatGroup.add(beanie);
    }
  };

  // Role accessories on head
  if (role === 'newb') {
    const tuftGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
    const tuft = new THREE.Mesh(tuftGeo, getDoodleMaterial(0x1a1614));
    tuft.position.set(0, 0.38, 0);
    head.add(tuft);
  } else if (role === 'caretaker') {
    // Caretaker nurse/doctor cap with medical cross from Die of Death in Roblox
    const capGeo = new THREE.BoxGeometry(0.52, 0.18, 0.38);
    const cap = new THREE.Mesh(capGeo, getDoodleMaterial(0xffffff));
    cap.position.set(0, 0.35, 0.05);
    head.add(cap);
    addInkOutline(cap, capGeo, 1.08);

    const greenMat = getDoodleMaterial(0x10b981); // Die of Death green medic plus
    const capCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), greenMat);
    const capCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.04), greenMat);
    capCrossH.position.set(0, 0, 0.2);
    capCrossV.position.set(0, 0, 0.2);
    cap.add(capCrossH);
    cap.add(capCrossV);
  } else if (role === 'builda_men') {
    // Roblox Builderman Construction Hardhat
    const hatGeo = new THREE.SphereGeometry(0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hatMat = getDoodleMaterial(0xff7900); // bright orange hardhat
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.set(0, 0.2, 0);
    head.add(hat);
    addInkOutline(hat, hatGeo, 1.08);

    const brimGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.06, 12);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, 0.22, 0);
    head.add(brim);
  } else if (role === 'gambling_guy') {
    buildGamblerHat('top_hat');
  } else if (role === 'protector_guy') {
    // Tough warrior headband
    const bandGeo = new THREE.BoxGeometry(0.64, 0.12, 0.58);
    const bandMat = getDoodleMaterial(0xd90429);
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0, 0.22, 0);
    head.add(band);
  }

  // 3. Limbs
  const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
  const armMat = getDoodleMaterial(headSkinColor);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.48, 0.28, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, armMat);
  leftArmMesh.position.y = -0.32;
  leftArm.add(leftArmMesh);
  torso.add(leftArm);
  addInkOutline(leftArmMesh, armGeo, 1.1);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.48, 0.28, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, armMat);
  rightArmMesh.position.y = -0.32;
  rightArm.add(rightArmMesh);
  torso.add(rightArm);
  addInkOutline(rightArmMesh, armGeo, 1.1);

  // Held Item & Potion Bottle in hand
  const heldItem = new THREE.Group();
  heldItem.position.set(0, -0.65, 0.15);
  rightArm.add(heldItem);

  const flashGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8);
  const flashMat = getDoodleMaterial(0x38302c);
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.rotation.x = Math.PI / 2;
  heldItem.add(flashMesh);

  // Potion bottle for drinking ability (hidden by default)
  const potionGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.28, 8);
  const potionMat = getDoodleMaterial(0x06d6a0);
  const potionMesh = new THREE.Mesh(potionGeo, potionMat);
  potionMesh.position.set(0, 0.1, 0);
  potionMesh.visible = false;
  heldItem.add(potionMesh);

  // FLASHLIGHT BEAM: Mounted on root at chest level pointing strictly in front of the player!
  const spotLight = new THREE.SpotLight(0xfffae6, 3.5, 20, Math.PI / 5, 0.35, 1);
  spotLight.position.set(0, 1.3, 0.4);
  spotLight.target.position.set(0, 1.1, 14);
  root.add(spotLight);
  root.add(spotLight.target);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
  const legMat = getDoodleMaterial(pantsColor);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, -0.45, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, legMat);
  leftLegMesh.position.y = -0.4;
  leftLeg.add(leftLegMesh);
  torso.add(leftLeg);
  addInkOutline(leftLegMesh, legGeo, 1.1);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, -0.45, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, legMat);
  rightLegMesh.position.y = -0.4;
  rightLeg.add(rightLegMesh);
  torso.add(rightLeg);
  addInkOutline(rightLegMesh, legGeo, 1.1);

  // Transparency handler for Invisibility Potion
  const setTransparency = (opacity: number) => {
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = (child as THREE.Mesh).material;
        if (Array.isArray(m)) {
          m.forEach((mat) => {
            mat.transparent = opacity < 1.0;
            mat.opacity = opacity;
          });
        } else if (m) {
          m.transparent = opacity < 1.0;
          m.opacity = opacity;
        }
      }
    });
  };

  // Animation handler
  const updateAnimation = (
    time: number,
    isMoving: boolean,
    isSprinting: boolean,
    isCrouching: boolean,
    isVaulting: boolean,
    action?: string | null
  ) => {
    // Ragdolled state
    if (action === 'ragdoll') {
      torso.position.y = 0.25;
      torso.rotation.x = Math.PI / 2;
      torso.rotation.z = 0.3;
      leftLeg.rotation.x = 0.4;
      rightLeg.rotation.x = -0.2;
      leftArm.rotation.x = 1.4;
      rightArm.rotation.x = -1.2;
      potionMesh.visible = false;
      return;
    }

    // Drinking Potion animation
    if (action === 'drinking') {
      potionMesh.visible = true;
      flashMesh.visible = false;
      rightArm.rotation.x = -2.3;
      rightArm.rotation.z = -0.45;
      head.rotation.x = -0.35 + Math.sin(time * 12) * 0.05;
      leftArm.rotation.x = 0.2;
      torso.position.y = 1.35;
      torso.rotation.x = 0;
      return;
    } else {
      potionMesh.visible = false;
      flashMesh.visible = true;
    }

    // Crouch adjustment
    if (isCrouching) {
      torso.position.y = 0.85;
      torso.rotation.x = 0.35;
      leftLeg.rotation.x = -0.6;
      rightLeg.rotation.x = -0.6;
    } else {
      torso.position.y = 1.35;
      torso.rotation.x = 0;
    }

    if (isVaulting) {
      torso.position.y = 1.8;
      torso.rotation.x = -0.5;
      leftArm.rotation.x = -1.6;
      rightArm.rotation.x = -1.6;
      leftLeg.rotation.x = 1.2;
      rightLeg.rotation.x = 0.8;
      return;
    }

    if (action === 'repairing' || action === 'building') {
      leftArm.rotation.x = -1.1;
      leftArm.rotation.z = 0.4;
      rightArm.rotation.x = -1.1 + Math.sin(time * 14) * 0.35; // hammering/wrenching motion
      rightArm.rotation.z = -0.4;
      head.rotation.x = 0.4 + Math.sin(time * 6) * 0.05;
      return;
    }

    if (action === 'splashing' || action === 'smashing') {
      rightArm.rotation.x = -1.6;
      rightArm.rotation.y = -0.4;
      leftArm.rotation.x = -0.6;
      return;
    }

    if (action === 'coin_flip') {
      rightArm.rotation.x = -1.2 + Math.sin(time * 12) * 0.4;
      head.rotation.x = -0.2;
      return;
    }

    if (action === 'shooting') {
      rightArm.rotation.x = -1.55;
      rightArm.rotation.y = 0;
      leftArm.rotation.x = -0.4;
      return;
    }

    if (action === 'blocking') {
      // Guard stance with crossed arms in front of chest
      leftArm.rotation.x = -1.35;
      leftArm.rotation.y = 0.6;
      leftArm.rotation.z = 0.35;
      rightArm.rotation.x = -1.35;
      rightArm.rotation.y = -0.6;
      rightArm.rotation.z = -0.35;
      torso.rotation.x = 0.12;
      return;
    }

    if (action === 'punching') {
      rightArm.rotation.x = -1.6;
      rightArm.rotation.y = -0.2;
      rightArm.position.z = 0.35;
      torso.rotation.y = 0.3;
      return;
    }

    if (action === 'charging') {
      torso.rotation.x = 0.4;
      torso.position.y = 1.1;
      leftArm.rotation.x = 1.0;
      rightArm.rotation.x = 1.0;
      leftLeg.rotation.x = Math.sin(time * 16) * 0.9;
      rightLeg.rotation.x = -Math.sin(time * 16) * 0.9;
      return;
    }

    if (isMoving) {
      const freq = isSprinting ? 14 : 8;
      const amp = isSprinting ? 1.0 : 0.6;
      const legCycle = Math.sin(time * freq) * amp;

      leftLeg.rotation.x = legCycle;
      rightLeg.rotation.x = -legCycle;

      leftArm.rotation.x = -legCycle * 0.8;
      rightArm.rotation.x = legCycle * 0.8;

      torso.position.y = (isCrouching ? 0.85 : 1.35) + Math.abs(Math.sin(time * freq)) * 0.1;
      head.rotation.y = Math.sin(time * freq * 0.5) * 0.08;
    } else {
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = Math.sin(time * 2) * 0.05;
      rightArm.rotation.x = -Math.sin(time * 2) * 0.05;
      torso.position.y = (isCrouching ? 0.85 : 1.35) + Math.sin(time * 2) * 0.03;
      head.rotation.x = Math.sin(time * 1.5) * 0.04;
    }
  };

  // Survivor Hurtbox wireframe for Hitbox visualizer setting
  const hurtboxGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.9, 8);
  const hurtboxMat = new THREE.MeshBasicMaterial({
    color: 0x06d6a0,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const hurtboxMesh = new THREE.Mesh(hurtboxGeo, hurtboxMat);
  hurtboxMesh.position.y = 0.95;
  hurtboxMesh.visible = false;
  root.add(hurtboxMesh);

  const setHitboxVisible = (visible: boolean) => {
    hurtboxMesh.visible = visible;
  };

  return {
    root,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    heldItem,
    flashlightBeam: spotLight,
    flashlightMesh: flashMesh,
    setTransparency,
    setGamblerHat: buildGamblerHat,
    setHitboxVisible,
    updateAnimation,
  };
}

/**
 * Builds an imposing 3D doodle Hunter rig (The Ink Stalker / The Scribbler / The Marionette)
 */
export function createHunterModel(hunterClass: HunterClass): AnimatedCharacterRig {
  const root = new THREE.Group();

  // Red Terror Stain on the floor (projected cone forward)
  const stainGeo = new THREE.ConeGeometry(2.5, 6, 16);
  stainGeo.rotateX(-Math.PI / 2);
  stainGeo.translate(0, 0, 3.2);
  const stainMat = new THREE.MeshBasicMaterial({
    color: 0xef233c,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const redStain = new THREE.Mesh(stainGeo, stainMat);
  redStain.position.y = 0.04;
  root.add(redStain);

  // Height scale: Hunters are tall and menacing (2.2m - 2.5m)
  const isScribbler = hunterClass === 'scribbler';
  const isMarionette = hunterClass === 'marionette';

  // 1. Torso
  const torsoWidth = isScribbler ? 1.2 : 0.85;
  const torsoHeight = 1.3;
  const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, 0.6);
  const hunterTorsoMat = getDoodleMaterial(isScribbler ? 0x2b2d42 : isMarionette ? 0x4a4036 : 0x171513, 0.9);
  const torso = new THREE.Mesh(torsoGeo, hunterTorsoMat);
  torso.position.y = 1.8;
  torso.castShadow = true;
  root.add(torso);
  addInkOutline(torso, torsoGeo, 1.08);

  // Ink Spikes / Cloak
  const spikeGeo = new THREE.ConeGeometry(0.18, 0.6, 4);
  const spikeMat = getDoodleMaterial(0x11100e);
  for (let s = 0; s < 4; s++) {
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    spike.position.set((s - 1.5) * 0.35, 0.65, -0.2);
    spike.rotation.x = -0.3;
    torso.add(spike);
  }

  // 2. Head
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0);
  torso.add(head);

  const headGeo = new THREE.BoxGeometry(0.7, 0.8, 0.65);
  const headMat = getDoodleMaterial(isMarionette ? 0xf0ece1 : 0x1f1c1a);
  const headMesh = new THREE.Mesh(headGeo, headMat);
  head.add(headMesh);
  addInkOutline(headMesh, headGeo, 1.08);

  // Horns / Spikes on head
  const hornGeo = new THREE.ConeGeometry(0.12, 0.5, 4);
  const leftHorn = new THREE.Mesh(hornGeo, spikeMat);
  leftHorn.position.set(-0.3, 0.55, 0);
  leftHorn.rotation.z = 0.4;
  head.add(leftHorn);

  const rightHorn = new THREE.Mesh(hornGeo, spikeMat);
  rightHorn.position.set(0.3, 0.55, 0);
  rightHorn.rotation.z = -0.4;
  head.add(rightHorn);

  // Glowing evil ink eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1020 });
  const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.18, 0.12, 0.34);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.18, 0.12, 0.34);
  head.add(rightEye);

  // 3. Arms & Giant Doodle Weapon
  const armGeo = new THREE.BoxGeometry(0.28, 1.1, 0.28);
  const armMat = getDoodleMaterial(0x191715);

  const leftArm = new THREE.Group();
  leftArm.position.set(-(torsoWidth * 0.6 + 0.1), 0.4, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, armMat);
  leftArmMesh.position.y = -0.5;
  leftArm.add(leftArmMesh);
  torso.add(leftArm);
  addInkOutline(leftArmMesh, armGeo, 1.1);

  const rightArm = new THREE.Group();
  rightArm.position.set(torsoWidth * 0.6 + 0.1, 0.4, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, armMat);
  rightArmMesh.position.y = -0.5;
  rightArm.add(rightArmMesh);
  torso.add(rightArm);
  addInkOutline(rightArmMesh, armGeo, 1.1);

  // Hunter Weapon
  const heldItem = new THREE.Group();
  heldItem.position.set(0, -1.0, 0.2);
  rightArm.add(heldItem);

  if (hunterClass === 'black_slasher') {
    // Giant Ink Quill Scythe (Black Slasher weapon)
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
    const shaftMat = getDoodleMaterial(0x3a3028);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.rotation.z = Math.PI / 4;
    heldItem.add(shaft);

    const bladeGeo = new THREE.ConeGeometry(0.25, 1.2, 4);
    const bladeMat = getDoodleMaterial(0x11100e);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0.65, 0.75, 0);
    blade.rotation.z = -1.2;
    heldItem.add(blade);
  } else if (hunterClass === 'scribbler') {
    // Heavy Charcoal Eraser Club
    const clubShaftGeo = new THREE.CylinderGeometry(0.07, 0.08, 1.4, 8);
    const clubShaft = new THREE.Mesh(clubShaftGeo, getDoodleMaterial(0x282828));
    heldItem.add(clubShaft);

    const headGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
    const clubHead = new THREE.Mesh(headGeo, getDoodleMaterial(0xdf2935));
    clubHead.position.y = 0.7;
    heldItem.add(clubHead);
    addInkOutline(clubHead, headGeo, 1.15);
  } else {
    // Marionette: Huge Drafting Compass Blade
    const needleGeo = new THREE.ConeGeometry(0.06, 1.8, 4);
    const needleMat = getDoodleMaterial(0x8d99ae);
    const needle1 = new THREE.Mesh(needleGeo, needleMat);
    needle1.rotation.z = 0.2;
    heldItem.add(needle1);

    const needle2 = new THREE.Mesh(needleGeo, needleMat);
    needle2.rotation.z = -0.2;
    heldItem.add(needle2);
  }

  // 4. Legs
  const legGeo = new THREE.BoxGeometry(0.32, 1.1, 0.32);
  const legMat = getDoodleMaterial(0x151311);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.28, -0.65, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, legMat);
  leftLegMesh.position.y = -0.55;
  leftLeg.add(leftLegMesh);
  torso.add(leftLeg);
  addInkOutline(leftLegMesh, legGeo, 1.1);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.28, -0.65, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, legMat);
  rightLegMesh.position.y = -0.55;
  rightLeg.add(rightLegMesh);
  torso.add(rightLeg);
  addInkOutline(rightLegMesh, legGeo, 1.1);

  let attackAnimationTimer = 0;

  // Toggle Raging Red Eyes
  const setRagingEyes = (active: boolean) => {
    if (active) {
      eyeMat.color.setHex(0xff0011);
    } else {
      eyeMat.color.setHex(0xff1020);
    }
  };

  const updateAnimation = (
    time: number,
    isMoving: boolean,
    isSprinting: boolean,
    _isCrouching: boolean,
    _isVaulting: boolean,
    action?: string | null
  ) => {
    // Charging Ability
    if (action === 'charging') {
      torso.position.y = 1.45;
      torso.rotation.x = 0.55;
      const chargeCycle = Math.sin(time * 18) * 0.9;
      leftLeg.rotation.x = chargeCycle;
      rightLeg.rotation.x = -chargeCycle;
      rightArm.rotation.x = -1.9;
      rightArm.rotation.z = -0.3;
      leftArm.rotation.x = 0.9;
      return;
    }

    // Gashing Wound Animation
    if (action === 'gashing') {
      torso.position.y = 1.7;
      torso.rotation.y = 0.65;
      torso.rotation.x = 0.2;
      rightArm.rotation.x = -2.1;
      rightArm.rotation.z = -0.85;
      leftArm.rotation.x = 0.4;
      return;
    }

    // Attack swing animation
    if (action === 'attacking') {
      attackAnimationTimer += 0.2;
      rightArm.rotation.x = -Math.sin(attackAnimationTimer * Math.PI) * 2.4;
      rightArm.rotation.z = -Math.sin(attackAnimationTimer * Math.PI) * 0.8;
      torso.rotation.y = Math.sin(attackAnimationTimer * Math.PI) * 0.5;
      return;
    } else {
      attackAnimationTimer = 0;
      torso.rotation.y = 0;
      torso.rotation.x = 0;
    }

    if (isMoving) {
      const speedMult = isSprinting ? 12 : 7.5;
      const legCycle = Math.sin(time * speedMult) * 0.75;
      leftLeg.rotation.x = legCycle;
      rightLeg.rotation.x = -legCycle;

      leftArm.rotation.x = -legCycle * 0.6;
      rightArm.rotation.x = -0.4 + legCycle * 0.4;

      torso.position.y = 1.8 + Math.abs(Math.sin(time * speedMult)) * 0.12;
      head.rotation.y = Math.sin(time * speedMult * 0.5) * 0.15;
    } else {
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = Math.sin(time * 1.8) * 0.08;
      rightArm.rotation.x = -0.4 + Math.sin(time * 1.8) * 0.08;
      torso.position.y = 1.8 + Math.sin(time * 1.8) * 0.04;
    }
  };

  // Stun Immunity Forcefield (8-second shield after getting stunned)
  const forcefieldGeo = new THREE.SphereGeometry(2.1, 16, 16);
  const forcefieldMat = new THREE.MeshBasicMaterial({
    color: 0x48cae4,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const forcefieldMesh = new THREE.Mesh(forcefieldGeo, forcefieldMat);
  forcefieldMesh.position.y = 1.6;
  forcefieldMesh.visible = false;
  root.add(forcefieldMesh);

  // Inner pulsing glow shield
  const innerShieldGeo = new THREE.SphereGeometry(2.0, 12, 12);
  const innerShieldMat = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const innerShieldMesh = new THREE.Mesh(innerShieldGeo, innerShieldMat);
  forcefieldMesh.add(innerShieldMesh);

  const setForcefieldActive = (active: boolean) => {
    forcefieldMesh.visible = active;
  };

  const updateForcefield = (time: number) => {
    if (forcefieldMesh.visible) {
      forcefieldMesh.rotation.y = time * 2.5;
      forcefieldMesh.rotation.x = Math.sin(time * 3.0) * 0.25;
      const s = 1.0 + Math.sin(time * 8.0) * 0.06;
      forcefieldMesh.scale.set(s, s, s);
    }
  };

  // Hunter Hitboxes wireframe group for Hitbox settings
  const hitboxGroup = new THREE.Group();
  hitboxGroup.visible = false;
  root.add(hitboxGroup);

  // Attack reach hitbox (2.8m cone/box in front)
  const attackBoxGeo = new THREE.BoxGeometry(2.4, 2.0, 2.8);
  const attackBoxMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const attackBox = new THREE.Mesh(attackBoxGeo, attackBoxMat);
  attackBox.position.set(0, 1.3, 1.5);
  hitboxGroup.add(attackBox);

  // Charge grab area (cylinder 2.5m radius)
  const grabGeo = new THREE.CylinderGeometry(2.5, 2.5, 2.2, 12);
  const grabMat = new THREE.MeshBasicMaterial({
    color: 0x7209b7,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });
  const grabBox = new THREE.Mesh(grabGeo, grabMat);
  grabBox.position.y = 1.1;
  hitboxGroup.add(grabBox);

  const setHitboxVisible = (visible: boolean) => {
    hitboxGroup.visible = visible;
  };

  return {
    root,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    heldItem,
    redStain,
    forcefieldMesh,
    setRagingEyes,
    setForcefieldActive,
    updateForcefield,
    setHitboxVisible,
    updateAnimation,
  };
}

/**
 * Creates 3D Doodle Generator Model (Sketch Engine)
 */
export function createGeneratorModel(): {
  root: THREE.Group;
  pistonMesh: THREE.Mesh;
  bulbMeshes: THREE.Mesh[];
  update: (progress: number, time: number) => void;
} {
  const root = new THREE.Group();

  // Engine Base Box
  const baseGeo = new THREE.BoxGeometry(1.6, 1.2, 1.4);
  const baseMat = getDoodleMaterial(0x5a544c);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.6;
  base.castShadow = true;
  root.add(base);
  addInkOutline(base, baseGeo, 1.05);

  // Copper Coils
  const coilGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12);
  const coilMat = getDoodleMaterial(0xb87333);
  const coil = new THREE.Mesh(coilGeo, coilMat);
  coil.position.set(-0.4, 0.7, 0);
  base.add(coil);

  // Piston
  const pistonGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
  const pistonMat = getDoodleMaterial(0x8f857d);
  const piston = new THREE.Mesh(pistonGeo, pistonMat);
  piston.position.set(0.4, 0.8, 0);
  base.add(piston);

  // 4 Light bulbs on top (1 turns on per 25% completed)
  const bulbMeshes: THREE.Mesh[] = [];
  const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);

  for (let b = 0; b < 4; b++) {
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      emissive: 0x000000,
      roughness: 0.3,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(-0.45 + b * 0.3, 0.75, 0.55);
    base.add(bulb);
    bulbMeshes.push(bulb);
  }

  // Large center signal beacon
  const beaconGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    emissive: 0x000000,
    roughness: 0.2,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 1.1, 0);
  base.add(beacon);

  const update = (progress: number, time: number) => {
    // Piston pumping when being repaired
    if (progress > 0 && progress < 100) {
      piston.position.y = 0.8 + Math.sin(time * 12) * 0.15;
    }

    // Light up bulbs based on 25% chunks
    const litCount = Math.floor(progress / 25);
    bulbMeshes.forEach((bulb, idx) => {
      const mat = bulb.material as THREE.MeshStandardMaterial;
      if (idx < litCount) {
        mat.color.setHex(0xf7d070);
        mat.emissive.setHex(0xf7b731);
      } else {
        mat.color.setHex(0x333333);
        mat.emissive.setHex(0x000000);
      }
    });

    if (progress >= 100) {
      // Finished generator bright glow
      beaconMat.color.setHex(0x2ecc71);
      beaconMat.emissive.setHex(0x27ae60);
    }
  };

  return { root, pistonMesh: piston, bulbMeshes, update };
}

/**
 * Creates 3D Doodle Pallet Model
 */
export function createPalletModel(): {
  root: THREE.Group;
  palletPlanks: THREE.Group;
  drop: () => void;
  breakPallet: () => void;
} {
  const root = new THREE.Group();

  // Two side support upright posts
  const postGeo = new THREE.BoxGeometry(0.25, 1.8, 0.25);
  const woodMat = getDoodleMaterial(0x826a54);

  const leftPost = new THREE.Mesh(postGeo, woodMat);
  leftPost.position.set(-1.1, 0.9, 0);
  root.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, woodMat);
  rightPost.position.set(1.1, 0.9, 0);
  root.add(rightPost);

  // Pallet Planks Group (can pivot down from 75 deg upright to flat)
  const palletPlanks = new THREE.Group();
  palletPlanks.position.set(0, 0.1, 0);
  palletPlanks.rotation.x = -Math.PI / 2.5; // upright standing
  root.add(palletPlanks);

  const plankGeo = new THREE.BoxGeometry(2.0, 0.1, 0.35);
  for (let p = 0; p < 4; p++) {
    const plank = new THREE.Mesh(plankGeo, woodMat);
    plank.position.set(0, 0, (p - 1.5) * 0.45);
    palletPlanks.add(plank);
    addInkOutline(plank, plankGeo, 1.06);
  }

  const drop = () => {
    palletPlanks.rotation.x = 0; // slams flat on ground
    palletPlanks.position.y = 0.1;
  };

  const breakPallet = () => {
    palletPlanks.visible = false;
  };

  return { root, palletPlanks, drop, breakPallet };
}

/**
 * Creates 3D Doodle Window Frame for Vaulting
 */
export function createVaultWindowModel(): THREE.Group {
  const root = new THREE.Group();
  const brickMat = getDoodleMaterial(0xa39b8b);

  // Left wall
  const leftGeo = new THREE.BoxGeometry(0.8, 2.2, 0.3);
  const left = new THREE.Mesh(leftGeo, brickMat);
  left.position.set(-1.1, 1.1, 0);
  root.add(left);
  addInkOutline(left, leftGeo, 1.05);

  // Right wall
  const rightGeo = new THREE.BoxGeometry(0.8, 2.2, 0.3);
  const right = new THREE.Mesh(rightGeo, brickMat);
  right.position.set(1.1, 1.1, 0);
  root.add(right);
  addInkOutline(right, rightGeo, 1.05);

  // Low vault sill (0.8m high)
  const sillGeo = new THREE.BoxGeometry(1.4, 0.8, 0.35);
  const sill = new THREE.Mesh(sillGeo, brickMat);
  sill.position.set(0, 0.4, 0);
  root.add(sill);
  addInkOutline(sill, sillGeo, 1.06);

  return root;
}

/**
 * Creates 3D Doodle Chest Model
 */
export function createChestModel(): {
  root: THREE.Group;
  lid: THREE.Group;
  openChest: () => void;
} {
  const root = new THREE.Group();
  const chestMat = getDoodleMaterial(0x6b5b4e);

  // Box base
  const boxGeo = new THREE.BoxGeometry(1.0, 0.6, 0.7);
  const box = new THREE.Mesh(boxGeo, chestMat);
  box.position.y = 0.3;
  root.add(box);
  addInkOutline(box, boxGeo, 1.06);

  // Box lid
  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.35);
  root.add(lid);

  const lidMeshGeo = new THREE.BoxGeometry(1.05, 0.2, 0.75);
  const lidMesh = new THREE.Mesh(lidMeshGeo, chestMat);
  lidMesh.position.set(0, 0.1, 0.35);
  lid.add(lidMesh);
  addInkOutline(lidMesh, lidMeshGeo, 1.06);

  const openChest = () => {
    lid.rotation.x = -Math.PI / 2.2;
  };

  return { root, lid, openChest };
}

/**
 * Creates 3D Scribble Iron Cage Model
 */
export function createCageModel(): THREE.Group {
  const root = new THREE.Group();
  const cageMat = getDoodleMaterial(0x211f1d);

  // 4 corner poles
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
  for (let x of [-0.65, 0.65]) {
    for (let z of [-0.65, 0.65]) {
      const pole = new THREE.Mesh(poleGeo, cageMat);
      pole.position.set(x, 1.2, z);
      root.add(pole);
    }
  }

  // Crossbar doodle cage roof
  const roofGeo = new THREE.ConeGeometry(0.9, 0.6, 4);
  const roof = new THREE.Mesh(roofGeo, cageMat);
  roof.position.set(0, 2.6, 0);
  root.add(roof);

  return root;
}

/**
 * Creates 3D Doodle Escape Gate Model
 */
export function createEscapeGateModel(): {
  root: THREE.Group;
  door: THREE.Group;
  leverLight: THREE.Mesh;
  openGate: () => void;
  setPowered: (powered: boolean) => void;
} {
  const root = new THREE.Group();
  const stoneMat = getDoodleMaterial(0x3e3832);

  // Left Column
  const colGeo = new THREE.BoxGeometry(1.2, 4.5, 1.2);
  const leftCol = new THREE.Mesh(colGeo, stoneMat);
  leftCol.position.set(-2.5, 2.25, 0);
  root.add(leftCol);
  addInkOutline(leftCol, colGeo, 1.04);

  // Right Column
  const rightCol = new THREE.Mesh(colGeo, stoneMat);
  rightCol.position.set(2.5, 2.25, 0);
  root.add(rightCol);
  addInkOutline(rightCol, colGeo, 1.04);

  // Gate Header Arch
  const archGeo = new THREE.BoxGeometry(6.2, 1.0, 1.4);
  const arch = new THREE.Mesh(archGeo, stoneMat);
  arch.position.set(0, 4.8, 0);
  root.add(arch);
  addInkOutline(arch, archGeo, 1.04);

  // Sliding Iron Doodle Gate Door
  const door = new THREE.Group();
  door.position.set(0, 2.0, 0);
  root.add(door);

  const doorGeo = new THREE.BoxGeometry(3.8, 3.8, 0.2);
  const doorMat = getDoodleMaterial(0x1a1614);
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  door.add(doorMesh);
  addInkOutline(doorMesh, doorGeo, 1.04);

  // Electrical lever box on side column
  const boxGeo = new THREE.BoxGeometry(0.4, 0.8, 0.3);
  const boxMat = getDoodleMaterial(0x59524a);
  const leverBox = new THREE.Mesh(boxGeo, boxMat);
  leverBox.position.set(-1.8, 1.4, 0.65);
  root.add(leverBox);

  // Lever status light
  const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    emissive: 0x000000,
  });
  const leverLight = new THREE.Mesh(lightGeo, lightMat);
  leverLight.position.set(-1.8, 1.7, 0.82);
  root.add(leverLight);

  const setPowered = (powered: boolean) => {
    if (powered) {
      lightMat.color.setHex(0xf7d070);
      lightMat.emissive.setHex(0xf7b731);
    }
  };

  const openGate = () => {
    door.position.y = 5.2; // Slide upward into archway
    lightMat.color.setHex(0x2ecc71);
    lightMat.emissive.setHex(0x27ae60);
  };

  return { root, door, leverLight, openGate, setPowered };
}

/**
 * Builds 3D Doodle Sentry Turret (Builda Men Ability 1)
 * Takes 2 hits to destroy. Shoots bullets every 0.2s dealing 10 dmg and slowing killer.
 */
export function createSentryModel(): {
  root: THREE.Group;
  turretHead: THREE.Group;
  update: (dt: number, isFiring: boolean, targetAngle: number) => void;
  takeHit: () => number;
  destroy: () => void;
} {
  const root = new THREE.Group();
  let hitsRemaining = 2;

  // 1. Tripod Legs
  const legMat = getDoodleMaterial(0x2b2d42);
  const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(Math.sin(angle) * 0.45, 0.4, Math.cos(angle) * 0.45);
    leg.rotation.z = Math.cos(angle) * 0.4;
    leg.rotation.x = -Math.sin(angle) * 0.4;
    root.add(leg);
    addInkOutline(leg, legGeo, 1.08);
  }

  // 2. Swivel Mount
  const mountGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.35, 8);
  const mount = new THREE.Mesh(mountGeo, getDoodleMaterial(0x4a4e69));
  mount.position.y = 0.8;
  root.add(mount);
  addInkOutline(mount, mountGeo, 1.06);

  // 3. Rotating Turret Head
  const turretHead = new THREE.Group();
  turretHead.position.y = 1.0;
  root.add(turretHead);

  // Turret body
  const bodyGeo = new THREE.BoxGeometry(0.65, 0.5, 0.8);
  const bodyMat = getDoodleMaterial(0xf5a623); // Roblox Builderman signature orange
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  turretHead.add(body);
  addInkOutline(body, bodyGeo, 1.05);

  // Red targeting sensor
  const sensorGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const sensorMat = new THREE.MeshBasicMaterial({ color: 0xef233c });
  const sensor = new THREE.Mesh(sensorGeo, sensorMat);
  sensor.position.set(0, 0.15, 0.42);
  turretHead.add(sensor);

  // Dual Gatling Barrels
  const barrelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8);
  const barrelMat = getDoodleMaterial(0x1a1614);

  const leftBarrel = new THREE.Mesh(barrelGeo, barrelMat);
  leftBarrel.rotation.x = Math.PI / 2;
  leftBarrel.position.set(-0.16, 0, 0.65);
  turretHead.add(leftBarrel);

  const rightBarrel = new THREE.Mesh(barrelGeo, barrelMat);
  rightBarrel.rotation.x = Math.PI / 2;
  rightBarrel.position.set(0.16, 0, 0.65);
  turretHead.add(rightBarrel);

  // Muzzle flash
  const flashGeo = new THREE.SphereGeometry(0.18, 6, 6);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.position.set(0, 0, 1.05);
  muzzleFlash.visible = false;
  turretHead.add(muzzleFlash);

  let flashTimer = 0;

  const update = (dt: number, isFiring: boolean, targetAngle: number) => {
    turretHead.rotation.y = targetAngle;
    if (isFiring) {
      flashTimer += dt * 30;
      muzzleFlash.visible = Math.floor(flashTimer) % 2 === 0;
      turretHead.position.z = Math.sin(flashTimer * 8) * 0.04;
    } else {
      muzzleFlash.visible = false;
      turretHead.position.z = 0;
    }
  };

  const takeHit = (): number => {
    hitsRemaining--;
    if (hitsRemaining === 1) {
      // Show damaged dent
      body.scale.set(0.9, 0.85, 0.9);
      (sensor.material as THREE.MeshBasicMaterial).color.setHex(0xf39c12);
    }
    return hitsRemaining;
  };

  const destroy = () => {
    root.visible = false;
  };

  return { root, turretHead, update, takeHit, destroy };
}

/**
 * Builds 3D Doodle Healing Machine (Builda Men Ability 2)
 * Slowly rises up for 8 seconds, spins around, heals everyone near 1 HP every 0.5s. Takes 1 hit.
 */
export function createHealingMachineModel(): {
  root: THREE.Group;
  cabinet: THREE.Group;
  update: (dt: number, riseProgress: number) => void;
  destroy: () => void;
} {
  const root = new THREE.Group();

  // Ground base
  const baseGeo = new THREE.CylinderGeometry(0.8, 0.85, 0.15, 10);
  const base = new THREE.Mesh(baseGeo, getDoodleMaterial(0x34495e));
  base.position.y = 0.08;
  root.add(base);
  addInkOutline(base, baseGeo, 1.06);

  // Pulsing green healing ring on floor
  const ringGeo = new THREE.RingGeometry(2.4, 2.6, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x2ecc71,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  });
  const healRing = new THREE.Mesh(ringGeo, ringMat);
  healRing.rotation.x = -Math.PI / 2;
  healRing.position.y = 0.05;
  root.add(healRing);

  // Rising dispenser cabinet
  const cabinet = new THREE.Group();
  cabinet.position.y = 0.1;
  root.add(cabinet);

  const cabGeo = new THREE.BoxGeometry(0.85, 1.4, 0.85);
  const cabMat = getDoodleMaterial(0xecf0f1);
  const cabMesh = new THREE.Mesh(cabGeo, cabMat);
  cabMesh.position.y = 0.7;
  cabinet.add(cabMesh);
  addInkOutline(cabMesh, cabGeo, 1.05);

  // Green Cross emblems on all 4 faces
  const crossMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
  for (let f = 0; f < 4; f++) {
    const angle = (f / 4) * Math.PI * 2;
    const cH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.04), crossMat);
    const cV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.04), crossMat);
    const dist = 0.44;
    cH.position.set(Math.sin(angle) * dist, 0.8, Math.cos(angle) * dist);
    cH.rotation.y = angle;
    cV.position.set(Math.sin(angle) * dist, 0.8, Math.cos(angle) * dist);
    cV.rotation.y = angle;
    cabinet.add(cH);
    cabinet.add(cV);
  }

  // Spinning radar / antenna dish on top
  const dishGeo = new THREE.CylinderGeometry(0.35, 0.05, 0.25, 10);
  const dish = new THREE.Mesh(dishGeo, getDoodleMaterial(0x27ae60));
  dish.position.y = 1.55;
  cabinet.add(dish);

  let spinAngle = 0;

  const update = (dt: number, riseProgress: number) => {
    // Elevates from ground y=0.1 to y=0.1 during 8s build
    cabinet.position.y = Math.min(1.0, riseProgress) * 0.1;
    cabinet.scale.y = Math.max(0.15, Math.min(1.0, riseProgress));

    if (riseProgress >= 1.0) {
      spinAngle += dt * 2.8;
      dish.rotation.y = spinAngle;
      // Gentle pulse on healing ring
      const pulse = 1.0 + Math.sin(spinAngle * 2) * 0.15;
      healRing.scale.set(pulse, pulse, pulse);
      ringMat.opacity = 0.35 + Math.sin(spinAngle * 2) * 0.2;
    }
  };

  const destroy = () => {
    root.visible = false;
  };

  return { root, cabinet, update, destroy };
}

/**
 * Builds 3D Doodle Bonus Pad (Builda Men Ability 3)
 * Floor speed pad giving +20% speed for 2s (stackable uncapped). Takes 1 hit.
 */
export function createBonusPadModel(): {
  root: THREE.Group;
  update: (dt: number) => void;
  destroy: () => void;
} {
  const root = new THREE.Group();

  // Octagonal floor plate
  const padGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.08, 8);
  const padMat = getDoodleMaterial(0x1a1614);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.04;
  root.add(pad);
  addInkOutline(pad, padGeo, 1.06);

  // Glowing chevron speed arrows
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const arrowGroup = new THREE.Group();
  arrowGroup.position.y = 0.09;
  root.add(arrowGroup);

  for (let a = -1; a <= 1; a++) {
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.08), arrowMat);
    leftWing.position.set(-0.16, 0, a * 0.35);
    leftWing.rotation.y = -Math.PI / 4;
    arrowGroup.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.08), arrowMat);
    rightWing.position.set(0.16, 0, a * 0.35);
    rightWing.rotation.y = Math.PI / 4;
    arrowGroup.add(rightWing);
  }

  let time = 0;
  const update = (dt: number) => {
    time += dt * 4;
    arrowMat.color.setHex(Math.sin(time) > 0 ? 0x00f5d4 : 0xffee32);
    pad.position.y = 0.04 + Math.sin(time * 2) * 0.015;
  };

  const destroy = () => {
    root.visible = false;
  };

  return { root, update, destroy };
}

/**
 * Builds 3D Doodle Healing Cloud (Caretaker Ability 1 & 2)
 * Lingers on the ground for 5 seconds, healing 2 HP every second for anyone inside.
 */
export function createHealingCloudModel(): {
  root: THREE.Group;
  update: (dt: number, remainingTime: number) => void;
  destroy: () => void;
} {
  const root = new THREE.Group();

  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0x2ecc71,
    transparent: true,
    opacity: 0.35,
    wireframe: true,
  });

  const domeGeo = new THREE.SphereGeometry(2.4, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, cloudMat);
  dome.position.y = 0.05;
  root.add(dome);

  // Swirling particle rings
  const ringGeo = new THREE.RingGeometry(1.6, 2.2, 16);
  const ring = new THREE.Mesh(ringGeo, cloudMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.35;
  root.add(ring);

  let rot = 0;
  const update = (dt: number, remainingTime: number) => {
    rot += dt * 1.5;
    dome.rotation.y = rot;
    ring.rotation.z = -rot * 1.2;

    const fade = Math.min(1.0, remainingTime / 1.2);
    cloudMat.opacity = 0.38 * fade;
    const pulse = 1.0 + Math.sin(rot * 3) * 0.08;
    root.scale.set(pulse, pulse, pulse);
  };

  const destroy = () => {
    root.visible = false;
  };

  return { root, update, destroy };
}

/**
 * Builds Full 3D Map Environment
 */
export function createMapEnvironment(mapId: MapId): {
  groundMesh: THREE.Mesh;
  propsGroup: THREE.Group;
  wallColliders: { minX: number; maxX: number; minZ: number; maxZ: number }[];
} {
  const propsGroup = new THREE.Group();
  const wallColliders: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];

  const mapSize = 90; // 90m x 90m arena

  // Ground Plane with Doodle Parchment Texture
  const groundGeo = new THREE.PlaneGeometry(mapSize, mapSize);
  const paperTexture = createParchmentCanvasTexture(1024);
  paperTexture.repeat.set(12, 12);
  const groundMat = new THREE.MeshStandardMaterial({
    map: paperTexture,
    roughness: 0.9,
    metalness: 0.02,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;

  // Boundary Walls
  const boundMat = getDoodleMaterial(0x24201c);
  const half = mapSize / 2;
  const wallThickness = 2;
  const wallHeight = 5;

  const createBoundWall = (w: number, d: number, x: number, z: number) => {
    const geo = new THREE.BoxGeometry(w, wallHeight, d);
    const wall = new THREE.Mesh(geo, boundMat);
    wall.position.set(x, wallHeight / 2, z);
    propsGroup.add(wall);
    wallColliders.push({
      minX: x - w / 2 - 0.5,
      maxX: x + w / 2 + 0.5,
      minZ: z - d / 2 - 0.5,
      maxZ: z + d / 2 + 0.5,
    });
  };

  createBoundWall(mapSize, wallThickness, 0, half);
  createBoundWall(mapSize, wallThickness, 0, -half);
  createBoundWall(wallThickness, mapSize, half, 0);
  createBoundWall(wallThickness, mapSize, -half, 0);

  // Map-Specific Props & Buildings
  if (mapId === 'school') {
    // School: Center classroom building with door openings & corridors
    const wallMat = getDoodleMaterial(0xa89f91);
    const createRoomWall = (x: number, z: number, w: number, d: number) => {
      const geo = new THREE.BoxGeometry(w, 3.5, d);
      const m = new THREE.Mesh(geo, wallMat);
      m.position.set(x, 1.75, z);
      propsGroup.add(m);
      addInkOutline(m, geo, 1.04);
      wallColliders.push({
        minX: x - w / 2 - 0.4,
        maxX: x + w / 2 + 0.4,
        minZ: z - d / 2 - 0.4,
        maxZ: z + d / 2 + 0.4,
      });
    };

    // Main classroom halls
    createRoomWall(-15, 0, 14, 1.2);
    createRoomWall(15, 0, 14, 1.2);
    createRoomWall(0, 15, 1.2, 14);
    createRoomWall(0, -15, 1.2, 14);

    // Lockers and desks scattered
    const deskMat = getDoodleMaterial(0x786c5e);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 18 + (i % 3) * 6;
      const dx = Math.cos(angle) * dist;
      const dz = Math.sin(angle) * dist;

      const deskGeo = new THREE.BoxGeometry(1.6, 1.0, 1.2);
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(dx, 0.5, dz);
      desk.rotation.y = angle + 0.3;
      propsGroup.add(desk);
      addInkOutline(desk, deskGeo, 1.06);
      wallColliders.push({
        minX: dx - 1.1,
        maxX: dx + 1.1,
        minZ: dz - 1.1,
        maxZ: dz + 1.1,
      });
    }
  } else if (mapId === 'forest') {
    // Doodle Forest: Gnarled Ink Trees with conical leaf crowns
    const trunkMat = getDoodleMaterial(0x382e25);
    const leafMat = getDoodleMaterial(0x40534c);

    for (let t = 0; t < 38; t++) {
      const tx = (Math.random() - 0.5) * (mapSize - 16);
      const tz = (Math.random() - 0.5) * (mapSize - 16);
      // Avoid spawning on center spawn
      if (Math.hypot(tx, tz) < 6) continue;

      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.5, 6);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(tx, 1.75, tz);
      propsGroup.add(trunk);

      const crownGeo = new THREE.ConeGeometry(2.0, 3.5, 6);
      const crown = new THREE.Mesh(crownGeo, leafMat);
      crown.position.set(tx, 4.2, tz);
      propsGroup.add(crown);
      addInkOutline(crown, crownGeo, 1.06);

      wallColliders.push({
        minX: tx - 0.8,
        maxX: tx + 0.8,
        minZ: tz - 0.8,
        maxZ: tz + 0.8,
      });
    }
  } else if (mapId === 'lab') {
    // Laboratory: Cylindrical containment pods, chemical pipes
    const podMat = getDoodleMaterial(0x5c677d);
    for (let p = 0; p < 18; p++) {
      const angle = (p / 18) * Math.PI * 2;
      const r = 16 + (p % 2) * 10;
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;

      const podGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.0, 8);
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set(px, 1.5, pz);
      propsGroup.add(pod);
      addInkOutline(pod, podGeo, 1.06);

      wallColliders.push({
        minX: px - 1.1,
        maxX: px + 1.1,
        minZ: pz - 1.1,
        maxZ: pz + 1.1,
      });
    }
  } else {
    // Subway: Platform pillars, subway train car block
    const pillarMat = getDoodleMaterial(0x495057);
    for (let px = -25; px <= 25; px += 12) {
      for (let pz = -25; pz <= 25; pz += 12) {
        if (Math.hypot(px, pz) < 5) continue;
        const pilGeo = new THREE.BoxGeometry(1.2, 4.0, 1.2);
        const pillar = new THREE.Mesh(pilGeo, pillarMat);
        pillar.position.set(px, 2.0, pz);
        propsGroup.add(pillar);
        addInkOutline(pillar, pilGeo, 1.06);

        wallColliders.push({
          minX: px - 0.9,
          maxX: px + 0.9,
          minZ: pz - 0.9,
          maxZ: pz + 0.9,
        });
      }
    }
  }

  return { groundMesh, propsGroup, wallColliders };
}
