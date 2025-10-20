document.addEventListener('DOMContentLoaded', () => {
    const userListBody = document.getElementById('user-list-body');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Verificação de Segurança ---
    const currentUserData = getUserData();
    if (!currentUserData || !currentUserData.isMaster) {
        // Se o usuário não for o master, redireciona para a página principal.
        alert('Acesso negado. Esta área é restrita ao administrador.');
        window.location.href = 'index.html';
        return;
    }

    function getAllUsers() {
        return JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
    }

    function saveAllUsers(users) {
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    }

    function renderUserList() {
        if (!userListBody) return;
        userListBody.innerHTML = '';
        const allUsers = getAllUsers();
        const fragment = document.createDocumentFragment();

        Object.keys(allUsers).forEach(username => {
            // Não exibe o próprio usuário master na lista
            if (username === 'master') return;

            const user = allUsers[username];
            const row = document.createElement('tr');

            const usernameCell = document.createElement('td');
            usernameCell.textContent = username;
            row.appendChild(usernameCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = user.name;
            row.appendChild(nameCell);

            const actionsCell = document.createElement('td');
            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Redefinir Senha';
            resetBtn.className = 'control-btn';
            resetBtn.style.marginRight = '5px';
            resetBtn.addEventListener('click', () => handleResetPassword(username));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'control-btn danger-btn';
            deleteBtn.addEventListener('click', () => handleDeleteUser(username));

            actionsCell.appendChild(resetBtn);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);

            fragment.appendChild(row);
        });

        userListBody.appendChild(fragment);
    }

    function handleResetPassword(username) {
        const newPassword = prompt(`Digite a nova senha para o usuário "${username}":`);
        if (newPassword && newPassword.length >= 6) {
            if (confirm(`Tem certeza que deseja redefinir a senha de "${username}"?`)) {
                const allUsers = getAllUsers();
                allUsers[username].passwordHash = simpleHash(newPassword);
                saveAllUsers(allUsers);
                alert('Senha redefinida com sucesso!');
            }
        } else if (newPassword) {
            alert('A senha deve ter no mínimo 6 caracteres.');
        }
    }

    function handleDeleteUser(username) {
        if (confirm(`ATENÇÃO: Esta ação é irreversível.\nTem certeza que deseja excluir o usuário "${username}" e todo o seu histórico?`)) {
            const allUsers = getAllUsers();
            delete allUsers[username];
            saveAllUsers(allUsers);
            alert(`Usuário "${username}" excluído com sucesso.`);
            renderUserList(); // Atualiza a lista na tela
        }
    }

    // --- Lógica de Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }

    // --- Inicialização ---
    renderUserList();
});