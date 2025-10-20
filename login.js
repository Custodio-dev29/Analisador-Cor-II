document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const masterResetForm = document.getElementById('master-reset-form');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginFromRegisterLink = document.getElementById('show-login-from-register');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const showLoginFromForgotLink = document.getElementById('show-login-from-forgot');
    const showLoginFromMasterResetLink = document.getElementById('show-login-from-master-reset');

    const USERS_DB_KEY = 'colorAnalyzerUsers';

    // --- Lógica de Navegação dos Formulários ---

    function showForm(formToShow) {
        // Esconde todos os formulários
        [loginForm, registerForm, forgotPasswordForm, masterResetForm].forEach(form => {
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

    showLoginFromMasterResetLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForm(loginForm);
    });

    // --- Lógica de Formulário (Simulada) ---

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value.toLowerCase();
        const password = loginPasswordInput.value;

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
        const user = users[username];

        if (user && user.passwordHash === simpleHash(password)) {
            // Login bem-sucedido
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentUser', username); // Salva o usuário atual
            window.location.href = 'index.html';
        } else {
            alert('Usuário ou senha inválidos.');
        }
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const username = document.getElementById('register-username').value.toLowerCase();
        const password = document.getElementById('register-password').value;

        if (!name || !username || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (username.length < 3) {
            alert('O nome de usuário deve ter no mínimo 3 caracteres.');
            return;
        }

        if (password.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};

        if (users[username]) {
            alert('Este nome de usuário já está em uso.');
            return;
        }

        users[username] = {
            name: name,
            passwordHash: simpleHash(password),
            analysisHistory: [],
            referencePalette: [],
            analysisName: '',
            isMaster: username === 'master' // Define o usuário 'master'
        };

        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
        alert('Cadastro realizado com sucesso! Faça o login para continuar.');
        registerForm.reset();
        showForm(loginForm);
    });

    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const masterUsername = document.getElementById('master-username').value.toLowerCase();
        const masterPassword = document.getElementById('master-password').value;

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
        const masterUser = users[masterUsername];

        if (masterUser && masterUser.isMaster && masterUser.passwordHash === simpleHash(masterPassword)) {
            // Login de master bem-sucedido, mostra o formulário de reset
            showForm(masterResetForm);
        } else {
            alert('Credenciais de administrador inválidas.');
        }
    });

    masterResetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userToReset = document.getElementById('user-to-reset').value.toLowerCase();
        const newPassword = document.getElementById('new-password-for-user').value;

        if (!userToReset || !newPassword) {
            alert('Preencha o nome do usuário e a nova senha.');
            return;
        }

        if (newPassword.length < 6) {
            alert('A nova senha deve ter no mínimo 6 caracteres.');
            return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
        if (users[userToReset]) {
            users[userToReset].passwordHash = simpleHash(newPassword);
            localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
            alert(`Senha do usuário '${userToReset}' foi redefinida com sucesso.`);
            masterResetForm.reset();
            showForm(loginForm);
        } else {
            alert(`Usuário '${userToReset}' não encontrado.`);
        }
    });
});