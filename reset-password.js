document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageElement = document.getElementById('reset-message');

    // Pega o email e o token da URL
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');

    if (!email || !token) {
        messageElement.textContent = 'Link de recuperação inválido ou expirado.';
        messageElement.style.color = 'var(--danger-color)';
        resetForm.style.display = 'none';
        return;
    }

    resetForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem.');
            return;
        }

        const allUsers = JSON.parse(localStorage.getItem('colorAnalyzerUsers')) || {};
        const user = allUsers[email];

        // Valida o token e se não expirou (ex: 15 minutos)
        if (user && user.resetToken === token && user.resetTokenExpiry > Date.now()) {
            // Atualiza a senha
            user.passwordHash = simpleHash(newPassword); // simpleHash está em shared.js
            // Remove o token para que não possa ser reutilizado
            delete user.resetToken;
            delete user.resetTokenExpiry;

            localStorage.setItem('colorAnalyzerUsers', JSON.stringify(allUsers));
            alert('Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.');
            window.location.href = 'login.html';
        } else {
            alert('O link de recuperação é inválido ou expirou. Por favor, tente novamente.');
            window.location.href = 'login.html';
        }
    });
});