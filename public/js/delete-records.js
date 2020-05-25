// Make links clickable, but make it so that users must
// confirm their click action before it's allowed through.
document.querySelectorAll(`a[data-confirm-href]`).forEach((a) => {
  a.style.cursor = "pointer";
  a.addEventListener(`click`, securityClick, true);
});

function securityClick(evt) {
  link = evt.target;

  if (!confirm("please confirm deleting this record")) {
    // if the user cancels, we do nothing
    return evt.preventDefault();
  }

  // otherwise, we update the href and then let it through.
  link.href = encodeURI(link.dataset.confirmHref).replace(/\+/g, "%2B");
}
