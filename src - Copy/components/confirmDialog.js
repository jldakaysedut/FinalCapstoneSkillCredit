/** Nonblocking SkillCredit confirmation. The result is true only on Confirm. */
export function confirmDialog(message, title = 'Please confirm') {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('skillcredit:confirm', {
      detail: { title, message: String(message ?? ''), resolve }
    }));
  });
}
