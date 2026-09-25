/**
 * The ONLY place that imports GSAP. Register just the plugins actually used
 * so the bundle stays small: core + ScrollTrigger (+ the tiny useGSAP hook).
 * Components import { gsap, ScrollTrigger, useGSAP } from here, never from
 * 'gsap' directly.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
