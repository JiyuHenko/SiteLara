(() => {
  const toast = document.getElementById('toast');
  let toastTimer;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  };

  document.querySelectorAll('[data-coupon]').forEach((button) => {
    button.addEventListener('click', async () => {
      const coupon = button.dataset.coupon;
      try {
        await navigator.clipboard.writeText(coupon);
      } catch {
        const field = document.createElement('textarea');
        field.value = coupon;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      showToast(`Cupom ${coupon} copiado`);
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
