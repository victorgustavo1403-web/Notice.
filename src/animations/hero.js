import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger)

export function animateHeroText(target) {

  gsap.from(target, {
    y: 40,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out",
  });

};

export function scrollText(text, container) {

  gsap.to(text, {
   
     scale: 0.5,
   
    scrollTrigger: {
      trigger: container,
      start: "top -=100vh",
      end: "+=230vh",
      scrub: 2,
      pin: true,
    }
  })

}
export function scrollcont(text, container) {

  gsap.to(text, {
   
     opacity:1,
    y:-100,
    ease: "power3.out",
    scrollTrigger: {
      trigger: container,
      start: "top -=240vh",
      end: "+=245vh",
      scrub: 2,
      pin: true,
    }
  })

}
export function scrollTextopacity(text, container) {

  gsap.to(text, {
    opacity: 0.0,
    scrollTrigger: {
      trigger: container,
      start: "top -=100vh",
      end: "+=230vh",
      scrub: 2,
      pin: true,
    }
  })

}
// // export function scrollImg(text, container) {

// //   gsap.to(text, {
   
// //     opacity: 0.0,
// //     scale: 0.5,
    
// //     scrollTrigger: {
// //       trigger: container,
// //       start: "top -=100vh",
// //       end: "+=230vh",
// //       scrub: 2,
// //       pin: true,
// //     }
// //   })

// }
export function heroimgScale(target){

  const tl = gsap.timeline()

  tl.to(target,{

    scale:0.6,
   
  

  })
  .to(target, {


    scale:1,
     duration: 2

  })



}
export function herocontScale(target){

  const tl = gsap.timeline()

  tl.to(target,{

    scale:1.2,
    
  

  })
  .to(target, {

duration: 2,
    scale:1


  })



}



export function heroimageRotate(target) {

  const tl = gsap.timeline();
  
  gsap.to(target, {
    
    rotation:"+=360",
    duration: 9,
    
    repeat:-1,
    ease: "none",
  
  });

}

export function carrossel(target, speed = 10) {

  
  gsap.set(target, {
    force3D: true,
    willChange: "transform",
  });

  gsap.to(target, {
    xPercent: -50,
    duration: speed,
    ease: "none",
    repeat: -1,
    force3D: true,
  });

}