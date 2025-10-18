document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginFromRegisterLink = document.getElementById('show-login-from-register');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const showLoginFromForgotLink = document.getElementById('show-login-from-forgot');

    function showForm(formToShow) {
        // Esconde todos os formulários
        [loginForm, registerForm, forgotPasswordForm].forEach(form => {
            form.classList.remove('active-form');
        });
        // Mostra o formulário alvo
        formToShow.classList.add('active-form');
    }

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(registerForm);
    });

    showForgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(forgotPasswordForm);
    });

    showLoginFromRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(loginForm);
    });

    showLoginFromForgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(loginForm);
    });

    // --- Lógica de Formulário (Simulada) ---

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // AQUI: Futuramente, você faria uma chamada para sua API de backend
        alert('Login simulado com sucesso!');
        // Salva um indicador de que o usuário está logado na sessão do navegador
        sessionStorage.setItem('isLoggedIn', 'true');
        // Redireciona para a página principal
        window.location.href = 'index.html';
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Cadastro simulado com sucesso! Agora você pode fazer login.');
        showForm(loginForm);
    });

    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Se o e-mail estiver cadastrado, um link de recuperação foi enviado.');
        showForm(loginForm);
    });
});