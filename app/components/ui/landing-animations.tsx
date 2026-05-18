"use client";

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';

export default function LandingAnimations() {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

      intro
        .from('[data-gsap="nav"]', { y: -20, opacity: 0, duration: 0.65 })
        .from('[data-gsap="hero-copy"]', { y: 28, opacity: 0, duration: 0.75 }, '-=0.35')
        .from('[data-gsap="hero-card"]', { y: 32, opacity: 0, duration: 0.7 }, '-=0.45')
        .from('[data-gsap="feature"]', { y: 24, opacity: 0, duration: 0.5, stagger: 0.12 }, '-=0.15')
        .from('[data-gsap="how"]', { y: 20, opacity: 0, duration: 0.55 }, '-=0.2')
        .from('[data-gsap="cta"]', { y: 20, opacity: 0, duration: 0.55 }, '-=0.2');

      gsap.to('[data-gsap="blob-a"]', {
        y: -20,
        x: 8,
        duration: 6.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('[data-gsap="blob-b"]', {
        y: 14,
        x: -10,
        duration: 7.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('[data-gsap="blob-c"]', {
        y: -16,
        duration: 6.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
