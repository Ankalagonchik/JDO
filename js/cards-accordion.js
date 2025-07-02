document.querySelectorAll('.card-list').forEach(deck => {
  deck.querySelectorAll('.debate-card').forEach(card => {
    const title = card.querySelector('.card-title');
    const details = card.querySelector('.card-details');
    details.style.maxHeight = '0';
    details.style.overflow = 'hidden';
    details.style.transition = 'max-height 0.35s cubic-bezier(.4,0,.2,1)';
    card.tabIndex = 0;
    card.style.outline = 'none';
    card.onclick = () => {
      deck.querySelectorAll('.debate-card').forEach(other => {
        if (other !== card) {
          other.querySelector('.card-details').style.maxHeight = '0';
          other.classList.remove('open');
        }
      });
      if (card.classList.contains('open')) {
        details.style.maxHeight = '0';
        card.classList.remove('open');
      } else {
        details.style.maxHeight = details.scrollHeight + 24 + 'px';
        card.classList.add('open');
      }
    };
    card.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        card.click();
        e.preventDefault();
      }
    };
  });
}); 