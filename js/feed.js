function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function () {
        showToast();
    }).catch(function (err) {
        console.error('Failed to copy: ', err);
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast();
    });
}

function copyGeneratedURL() {
    const generatedURL = document.getElementById('generated-url').textContent;
    copyToClipboard(generatedURL);
}

function updateURL() {
    const version = document.getElementById('bc-version').value;
    const type = document.getElementById('feed-type').value;
    const newURL = `https://feed.eos-solutions.app/${version}/${type}/index.json`;
    document.getElementById('generated-url').textContent = newURL;
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feed-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('mouseenter', function () {
            this.innerHTML = '<i class="fas fa-copy"></i> Copy';
        });
        btn.addEventListener('mouseleave', function () {
            this.innerHTML = '<i class="fas fa-copy"></i>';
        });
    });
});