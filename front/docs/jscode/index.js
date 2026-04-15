document.addEventListener('DOMContentLoaded', () => {
    
    // 1. EFECTO PARALLAX (Hologramas y Texto de fondo)
    const parallaxElements = document.querySelectorAll('.parallax-el');
    
    document.addEventListener('mousemove', (e) => {
        const x = window.innerWidth / 2 - e.pageX;
        const y = window.innerHeight / 2 - e.pageY;
        
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed'));
            const xOffset = x * speed;
            const yOffset = y * speed;
            
            if (el.id === 'ueqo-bg-giant') {
                el.style.transform = `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px))`;
            } else {
                // Mantiene las rotaciones que pusimos por CSS en los hologramas
                el.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            }
        });
    });

    // 2. ANIMACIÓN AL HACER SCROLL (Bloque de texto)
    const fadeElements = document.querySelectorAll('.fade-in');

    const appearOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('visible');
                appearOnScroll.unobserve(entry.target); 
            }
        });
    }, appearOptions);

    fadeElements.forEach(element => {
        appearOnScroll.observe(element);
    });

});