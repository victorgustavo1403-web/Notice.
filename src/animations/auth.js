import { gsap } from "gsap";


export function Cardauth(target) {

  gsap.from(target, {
    y: 40,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
  });

};
