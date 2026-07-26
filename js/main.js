// Mobile Menu Toggle
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            const navLinks = document.getElementById('navLinks');
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const nav = document.getElementById('mainNav');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        nav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.15)';
        nav.style.background = 'rgba(255,255,255,0.95)';
        nav.style.backdropFilter = 'blur(10px)';
    } else {
        nav.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        nav.style.background = '#ffffff';
        nav.style.backdropFilter = 'none';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards and steps
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add fade-in class for animations
document.addEventListener('DOMContentLoaded', () => {
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        .fade-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            z-index: 3000;
            max-width: 400px;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-success {
            border-left: 4px solid #4caf50;
        }
        
        .notification-error {
            border-left: 4px solid #f44336;
        }
        
        .notification-info {
            border-left: 4px solid #1a237e;
        }
        
        .notification i {
            font-size: 1.25rem;
        }
        
        .notification-success i {
            color: #4caf50;
        }
        
        .notification-error i {
            color: #f44336;
        }
        
        .notification-info i {
            color: #1a237e;
        }
    `;
    document.head.appendChild(style);
});

// Track page views for analytics (optional)
function trackPageView() {
    // You can add analytics tracking here
    console.log('Page view tracked');
}

// Lazy load images
document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
});
