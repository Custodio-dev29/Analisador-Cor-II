document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginFromRegisterLink = document.getElementById('show-login-from-register');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const showLoginFromForgotLink = document.getElementById('show-login-from-forgot');

    const USERS_DB_KEY = 'colorAnalyzerUsers';

    // --- Funções de Gerenciamento de Usuário (Simulado) ---

    // ATENÇÃO: Esta é uma função de hash insegura, apenas para demonstração.
    // Em um ambiente real, use bibliotecas criptográficas robustas (ex: bcrypt) no backend.
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Converte para um inteiro de 32bit
        }
        return hash.toString();
    }

    // --- Lógica de Navegação dos Formulários ---

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
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
        const user = users[email];

        if (user && user.passwordHash === simpleHash(password)) {
            // Login bem-sucedido
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentUser', email); // Salva o usuário atual
            window.location.href = 'index.html';
        } else {
            alert('E-mail ou senha inválidos.');
        }
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!name || !email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};

        if (users[email]) {
            alert('Este e-mail já está cadastrado.');
            return;
        }

        users[email] = {
            name: name,
            passwordHash: simpleHash(password),
            analysisHistory: [],
            referencePalette: []
        };

        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
        alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
        registerForm.reset();
        showForm(loginForm);
    });

    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        if (!email) {
            alert('Por favor, insira seu e-mail.');
            return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
        if (users[email]) {
            // Gera um token simples e um tempo de expiração (15 minutos)
            const token = Date.now().toString(36) + Math.random().toString(36).substring(2);
            const expiry = Date.now() + 15 * 60 * 1000; // 15 minutos a partir de agora

            users[email].resetToken = token;
            users[email].resetTokenExpiry = expiry;

            localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));

            // Simula o envio de e-mail mostrando o link para o usuário
            const recoveryLink = `${window.location.origin}${window.location.pathname.replace('login.html', '')}reset-password.html?email=${encodeURIComponent(email)}&token=${token}`;
            alert(`Link de recuperação (simulado):\n\n${recoveryLink}\n\nEm uma aplicação real, este link seria enviado para o seu e-mail.`);
        } else {
            alert('Se o e-mail estiver cadastrado, um link de recuperação foi enviado.');
        }
        showForm(loginForm);
    });
});