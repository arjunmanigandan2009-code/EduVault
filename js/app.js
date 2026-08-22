// ===== Supabase Configuration =====
// REPLACE with your Supabase Project URL and Anon Key
var SUPABASE_URL = 'https://dfrqsxncmdgattcaxakm.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcnFzeG5jbWRnYXR0Y2F4YWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NjU1MzEsImV4cCI6MjEwMjM0MTUzMX0.jnnY4aOCcZuIsLgfYmSzeDTUpyY2cUr-F1g5_lBvRrM';


var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== App State =====
var currentUser = null;
var currentUserData = null;
var allFiles = [];
var currentFilter = 'all';
var currentSearch = '';
var selectedFiles = [];
var selectedThumbnail = null;
var currentViewerFile = null;
var appShown = false;

var ADMIN_SECRET = 'eduvault2026';

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initCompactMode();
    showAuth();

    supabase.auth.onAuthStateChange(function(event, session) {
        if (session && session.user) {
            currentUser = session.user;
            loadUserData().then(function() {
                showApp();
            });
        } else {
            currentUser = null;
            currentUserData = null;
            showAuth();
        }
    });

    setupEventListeners();
});

// ===== Theme =====
function initTheme() {
    var saved = localStorage.getItem('sv-theme');
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    var toggle = document.getElementById('theme-toggle');
    var isDark = toggle.checked;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('sv-theme', isDark ? 'dark' : 'light');
}

function syncThemeToggle() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = isDark;
}

function initCompactMode() {
    var saved = localStorage.getItem('sv-compact');
    if (saved === 'true') {
        document.body.classList.add('compact');
    }
}

function toggleCompact() {
    var toggle = document.getElementById('compact-toggle');
    document.body.classList.toggle('compact', toggle.checked);
    localStorage.setItem('sv-compact', toggle.checked);
}

function syncCompactToggle() {
    var toggle = document.getElementById('compact-toggle');
    if (toggle) toggle.checked = document.body.classList.contains('compact');
}

// ===== Authentication =====
function showAuth() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

async function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    updateUserUI();
    if (!appShown) {
        await loadFiles();
        syncThemeToggle();
        syncCompactToggle();
        navigateTo('dashboard');
        appShown = true;
    }
}

function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('register-page').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.remove('hidden');
}

function togglePassword(inputId, btn) {
    var input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" x2="23" y1="1" y2="23"/></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

function setupEventListeners() {
    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var email = document.getElementById('login-email').value;
            var password = document.getElementById('login-password').value;
            var btn = document.getElementById('login-btn');
            var errorEl = document.getElementById('login-error');

            setLoading(btn, true);
            errorEl.classList.add('hidden');

            try {
                var result = await supabase.auth.signInWithPassword({ email: email, password: password });
                if (result.error) throw result.error;
            } catch (err) {
                console.error('Login error:', err.message);
                errorEl.textContent = err.message || 'Login failed. Please try again.';
                errorEl.classList.remove('hidden');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    var regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var name = document.getElementById('reg-name').value;
            var email = document.getElementById('reg-email').value;
            var password = document.getElementById('reg-password').value;
            var role = document.getElementById('reg-role').value;
            var btn = document.getElementById('register-btn');
            var errorEl = document.getElementById('register-error');

            setLoading(btn, true);
            errorEl.classList.add('hidden');

            if (role === 'admin') {
                var secret = document.getElementById('reg-admin-secret').value;
                if (secret !== ADMIN_SECRET) {
                    errorEl.textContent = 'Invalid admin secret key';
                    errorEl.classList.remove('hidden');
                    setLoading(btn, false);
                    return;
                }
            }

            try {
                var result = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { name: name, role: role } }
                });
                if (result.error) throw result.error;

                if (result.data.user) {
                    dbInsert('profiles', {
                        id: result.data.user.id,
                        name: name,
                        email: email,
                        role: role
                    }).catch(function(e) { console.warn('Profile create failed:', e.message); });
                }

                if (result.data.user && result.data.user.identities && result.data.user.identities.length === 0) {
                    errorEl.textContent = 'An account with this email already exists.';
                    errorEl.classList.remove('hidden');
                } else if (result.data.session) {
                    // Immediately logged in
                } else {
                    showToast('Account created! Check your email to verify, or sign in now.', 'success');
                    showLogin();
                }
            } catch (err) {
                console.error('Registration error:', err.message);
                errorEl.textContent = err.message || 'Registration failed. Please try again.';
                errorEl.classList.remove('hidden');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    var regRole = document.getElementById('reg-role');
    if (regRole) {
        regRole.addEventListener('change', function(e) {
            var secretGroup = document.getElementById('admin-secret-group');
            if (e.target.value === 'admin') {
                secretGroup.classList.remove('hidden');
            } else {
                secretGroup.classList.add('hidden');
            }
        });
    }

    var uploadForm = document.getElementById('upload-form');
    if (uploadForm) uploadForm.addEventListener('submit', handleUpload);

    var thumbnailPicker = document.getElementById('thumbnail-picker');
    var thumbnailInput = document.getElementById('thumbnail-input');
    if (thumbnailPicker && thumbnailInput) {
        thumbnailPicker.addEventListener('click', function(e) {
            if (e.target.closest('.thumb-remove')) return;
            thumbnailInput.click();
        });
        thumbnailInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Thumbnail must be under 5MB', 'error');
                return;
            }
            selectedThumbnail = file;
            var url = URL.createObjectURL(file);
            var preview = document.getElementById('thumbnail-preview');
            preview.innerHTML = '<img src="' + url + '" alt="thumbnail"><button type="button" class="thumb-remove" onclick="removeThumbnail(event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
            preview.classList.add('has-thumb');
            preview.style.position = 'relative';
        });
    }

    var fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            addFilesToSelection(Array.from(e.target.files));
            e.target.value = '';
        });
    }

    var dropzone = document.getElementById('dropzone');
    if (dropzone) {
        dropzone.addEventListener('click', function() { document.getElementById('file-input').click(); });
        dropzone.addEventListener('dragover', function(e) {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', function() { dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            addFilesToSelection(Array.from(e.dataTransfer.files));
        });
    }

    var editForm = document.getElementById('edit-form');
    if (editForm) editForm.addEventListener('submit', handleEditSave);

    var commentForm = document.getElementById('comment-form');
    if (commentForm) commentForm.addEventListener('submit', handleCommentSubmit);
}

async function loadUserData() {
    if (!currentUser) return;
    currentUserData = {
        name: currentUser.user_metadata && currentUser.user_metadata.name || currentUser.email.split('@')[0],
        email: currentUser.email,
        role: currentUser.user_metadata && currentUser.user_metadata.role || 'student'
    };

    try {
        var result = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (result.data) {
            currentUserData = {
                name: result.data.name || currentUserData.name,
                email: result.data.email || currentUserData.email,
                role: result.data.role || currentUserData.role
            };
        }
    } catch (err) {
        console.warn('Could not load profile, using metadata:', err.message);
    }
}

function updateUserUI() {
    if (!currentUser || !currentUserData) return;

    var name = currentUserData.name || currentUser.email.split('@')[0];
    var role = currentUserData.role || 'student';
    var initial = name.charAt(0).toUpperCase();

    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('sidebar-username').textContent = name;
    document.getElementById('sidebar-role').textContent = role;
    document.getElementById('dashboard-username').textContent = name;
    document.getElementById('settings-name').textContent = name;
    document.getElementById('settings-email').textContent = currentUser.email;
    document.getElementById('settings-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);

    var adminItems = document.querySelectorAll('.nav-admin');
    adminItems.forEach(function(item) {
        if (role === 'admin') {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });

    var adminViewerBtns = document.querySelectorAll('#viewer-edit-btn, #viewer-download-btn');
    adminViewerBtns.forEach(function(btn) {
        if (role === 'admin') {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
}

function isAdmin() {
    return currentUserData && currentUserData.role === 'admin';
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        allFiles = [];
        showToast('Signed out successfully', 'success');
    } catch (err) {
        showToast('Error signing out', 'error');
    }
}

function setLoading(btn, loading) {
    var span = btn.querySelector('span');
    var loader = btn.querySelector('.btn-loader');
    if (loading) {
        btn.disabled = true;
        if (span) span.classList.add('hidden');
        if (loader) loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        if (span) span.classList.remove('hidden');
        if (loader) loader.classList.add('hidden');
    }
}

// ===== Supabase Helpers =====
async function dbInsert(table, data) {
    return await supabase.from(table).insert(data);
}

async function dbSelect(table, filters, orderCol, orderAsc) {
    var query = supabase.from(table).select('*');
    if (filters) {
        filters.forEach(function(f) {
            query = query.eq(f.col, f.val);
        });
    }
    if (orderCol) {
        query = query.order(orderCol, { ascending: orderAsc !== false });
    }
    return await query;
}

async function dbUpdate(table, data, filters) {
    var query = supabase.from(table).update(data);
    filters.forEach(function(f) {
        query = query.eq(f.col, f.val);
    });
    return await query;
}

async function dbDelete(table, filters) {
    var query = supabase.from(table).delete();
    filters.forEach(function(f) {
        query = query.eq(f.col, f.val);
    });
    return await query;
}

// ===== Navigation =====
function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(function(item) {
        item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(function(p) { p.classList.add('hidden'); p.classList.remove('page-enter'); });
    var pageEl = document.getElementById('page-' + page);
    if (pageEl) {
        pageEl.classList.remove('hidden');
        void pageEl.offsetWidth;
        pageEl.classList.add('page-enter');
    }

    var titles = {
        dashboard: 'EduVault',
        browse: 'Browse Files',
        upload: 'Upload Files',
        manage: 'Manage Files',
        settings: 'Settings'
    };
    var titleEl = document.getElementById('page-title');
    var icon = '<svg class="topbar-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg> ';
    titleEl.innerHTML = icon + (titles[page] || 'EduVault');

    closeSidebar();

    if (page === 'dashboard') loadDashboard();
    if (page === 'browse') renderBrowseFiles();
    if (page === 'manage') renderManageFiles();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== File Management =====
async function loadFiles() {
    try {
        var result = await dbSelect('files', null, 'created_at', false);
        if (result.error) throw result.error;
        allFiles = (result.data || []).map(function(f) {
            f.id = f.id;
            f.title = f.title;
            f.description = f.description;
            f.category = f.category;
            f.file_name = f.file_name;
            f.file_type = f.file_type;
            f.file_size = f.file_size;
            f.file_path = f.file_path;
            f.download_url = f.download_url;
            f.uploaded_by = f.uploaded_by;
            f.uploader_name = f.uploader_name;
            f.created_at = f.created_at;
            return f;
        });
    } catch (err) {
        console.error('Error loading files:', err);
    }
}

function loadDashboard() {
    var total = allFiles.length;
    var pdfs = allFiles.filter(function(f) { return f.file_type === 'pdf'; }).length;
    var images = allFiles.filter(function(f) { return f.file_type === 'image'; }).length;
    var videos = allFiles.filter(function(f) { return f.file_type === 'video'; }).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pdfs').textContent = pdfs;
    document.getElementById('stat-images').textContent = images;
    document.getElementById('stat-videos').textContent = videos;

    var emptyMsg = document.getElementById('empty-message');
    if (currentUserData && currentUserData.role === 'admin') {
        emptyMsg.textContent = 'Upload some files to get started';
    } else {
        emptyMsg.textContent = 'No study materials available yet';
    }

    var recentFiles = allFiles.slice(0, 6);
    var container = document.getElementById('recent-files');

    if (recentFiles.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCC2</div><h3>No files yet</h3><p>' + (isAdmin() ? 'Upload some files to get started' : 'No study materials available yet') + '</p></div>';
        return;
    }

    container.innerHTML = recentFiles.map(createFileCard).join('');
}

function renderBrowseFiles() {
    var files = allFiles.slice();

    if (currentFilter !== 'all') {
        files = files.filter(function(f) { return f.file_type === currentFilter; });
    }

    if (currentSearch) {
        var q = currentSearch.toLowerCase();
        files = files.filter(function(f) {
            return (f.title && f.title.toLowerCase().indexOf(q) !== -1) ||
                (f.description && f.description.toLowerCase().indexOf(q) !== -1) ||
                (f.category && f.category.toLowerCase().indexOf(q) !== -1);
        });
    }

    var container = document.getElementById('browse-files');

    if (files.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDD0D</div><h3>No files found</h3><p>Try adjusting your search or filters</p></div>';
        return;
    }

    container.innerHTML = files.map(createFileCard).join('');
}

function renderManageFiles() {
    var files = allFiles.slice();

    if (currentSearch) {
        var q = currentSearch.toLowerCase();
        files = files.filter(function(f) {
            return (f.title && f.title.toLowerCase().indexOf(q) !== -1) ||
                (f.description && f.description.toLowerCase().indexOf(q) !== -1);
        });
    }

    var container = document.getElementById('manage-list');

    if (files.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCC2</div><h3>No files to manage</h3></div>';
        return;
    }

    container.innerHTML = files.map(function(file) {
        return '<div class="manage-item">' +
            '<div class="manage-item-icon ' + getFileClass(file.file_type) + '">' + getFileEmoji(file.file_type) + '</div>' +
            '<div class="manage-item-info">' +
            '<div class="manage-item-title">' + escapeHtml(file.title) + '</div>' +
            '<div class="manage-item-meta">' + formatFileSize(file.file_size) + ' \u00B7 ' + formatDate(file.created_at) + (file.category ? ' \u00B7 ' + escapeHtml(file.category) : '') + '</div>' +
            '</div>' +
            '<div class="manage-item-actions">' +
            '<button class="btn-icon" onclick="openEditModal(\'' + file.id + '\')" title="Edit">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>' +
            '</button>' +
            '<button class="btn-icon" onclick="openDeleteModal(\'' + file.id + '\', \'' + escapeHtml(file.title).replace(/'/g, "\\'") + '\')" title="Delete" style="color: var(--danger)">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>' +
            '</button>' +
            '</div></div>';
    }).join('');
}

function createFileCard(file) {
    var isImage = file.file_type === 'image';
    var thumbContent = '';

    var defaultThumb = 'https://dfrqsxncmdgattcaxakm.supabase.co/storage/v1/object/public/files/undefined/thumb_1787329078247_file_000000008654820b8c4e9f7db0d871fb.png';

    if (file.thumbnail_url) {
        thumbContent = '<img src="' + file.thumbnail_url + '" alt="' + escapeHtml(file.title) + '" loading="lazy">';
    } else if (isImage && file.download_url) {
        thumbContent = '<img src="' + file.download_url + '" alt="' + escapeHtml(file.title) + '" loading="lazy">';
    } else {
        thumbContent = '<img src="' + defaultThumb + '" alt="' + escapeHtml(file.title) + '" loading="lazy">';
    }

    return '<div class="file-card" onclick="openFileViewer(\'' + file.id + '\')">' +
        '<div class="file-card-thumb">' + thumbContent + '</div>' +
        '<div class="file-card-info">' +
        '<div class="file-card-title">' + escapeHtml(file.title) + '</div>' +
        '<div class="file-card-meta"><span>' + formatFileSize(file.file_size) + '</span><span>' + formatDate(file.created_at) + '</span></div>' +
        (file.category ? '<span class="file-card-category">' + escapeHtml(file.category) + '</span>' : '') +
        '</div></div>';
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(function(tab) {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    renderBrowseFiles();
}

function handleSearch(value) {
    currentSearch = value;
    renderBrowseFiles();
}

function handleManageSearch(value) {
    currentSearch = value;
    renderManageFiles();
}

// ===== Upload =====
function addFilesToSelection(files) {
    files.forEach(function(file) {
        if (file.size > 50 * 1024 * 1024) {
            showToast(file.name + ' exceeds 50MB limit', 'error');
            return;
        }
        selectedFiles.push(file);
    });
    renderFilePreviews();
}

function renderFilePreviews() {
    var container = document.getElementById('file-preview-list');
    container.innerHTML = selectedFiles.map(function(file, idx) {
        var thumbHtml = '';
        var isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        if (isImage) {
            var objectUrl = URL.createObjectURL(file);
            thumbHtml = '<img src="' + objectUrl + '" class="file-preview-thumb" alt="preview">';
        } else {
            thumbHtml = '<div class="file-preview-icon ' + getFileClass(getFileType(file.name)) + '">' + getFileEmoji(getFileType(file.name)) + '</div>';
        }
        return '<div class="file-preview-item">' +
            thumbHtml +
            '<div class="file-preview-info">' +
            '<div class="file-preview-name">' + escapeHtml(file.name) + '</div>' +
            '<div class="file-preview-size">' + formatFileSize(file.size) + '</div>' +
            '</div>' +
            '<button class="file-preview-remove" onclick="removeFile(' + idx + ')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></div>';
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderFilePreviews();
}

function removeThumbnail(e) {
    e.stopPropagation();
    selectedThumbnail = null;
    var preview = document.getElementById('thumbnail-preview');
    preview.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Add thumbnail</span>';
    preview.classList.remove('has-thumb');
    preview.style.position = '';
    document.getElementById('thumbnail-input').value = '';
}

async function handleUpload(e) {
    e.preventDefault();
    if (selectedFiles.length === 0) {
        showToast('Please select files to upload', 'error');
        return;
    }

    var title = document.getElementById('upload-title').value;
    var description = document.getElementById('upload-desc').value;
    var category = document.getElementById('upload-category').value;
    var btn = document.getElementById('upload-btn');
    var progressEl = document.getElementById('upload-progress');
    var progressFill = document.getElementById('progress-fill');
    var progressText = document.getElementById('progress-text');

    btn.disabled = true;
    progressEl.classList.remove('hidden');

    var thumbnailUrl = '';
    if (selectedThumbnail) {
        try {
            var thumbPath = currentUser.uid + '/thumb_' + Date.now() + '_' + selectedThumbnail.name;
            var thumbResult = await supabase.storage.from('files').upload(thumbPath, selectedThumbnail, { upsert: true, contentType: selectedThumbnail.type });
            if (!thumbResult.error) {
                var thumbPublic = supabase.storage.from('files').getPublicUrl(thumbPath);
                thumbnailUrl = thumbPublic.data.publicUrl;
            }
        } catch (err) {
            console.warn('Thumbnail upload failed:', err);
        }
    }

    var total = selectedFiles.length;
    var completed = 0;

    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        try {
            var fileExt = file.name.split('.').pop();
            var filePath = currentUser.uid + '/' + Date.now() + '_' + file.name;

            progressText.textContent = 'Uploading ' + (i + 1) + '/' + total + '...';
            progressFill.style.width = ((i / total) * 100) + '%';

            var uploadResult = await supabase.storage
                .from('files')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadResult.error) throw uploadResult.error;

            var publicUrlResult = supabase.storage
                .from('files')
                .getPublicUrl(filePath);

            var downloadURL = publicUrlResult.data.publicUrl;
            var fileType = getFileType(file.name);

            var fileData = {
                title: title || file.name,
                description: description || '',
                category: category || '',
                file_name: file.name,
                file_type: fileType,
                file_size: file.size,
                file_path: filePath,
                download_url: downloadURL,
                thumbnail_url: thumbnailUrl,
                uploaded_by: currentUser.uid,
                uploader_name: currentUserData.name || currentUser.email
            };

            var insertResult = await dbInsert('files', fileData);
            if (insertResult.error) throw insertResult.error;

            completed++;
        } catch (err) {
            console.error('Upload failed:', err);
            showToast('Error uploading ' + file.name + ': ' + (err.message || 'Unknown error'), 'error');
            completed++;
        }
    }

    progressFill.style.width = '100%';
    progressText.textContent = '100%';

    selectedFiles = [];
    selectedThumbnail = null;
    document.getElementById('file-preview-list').innerHTML = '';
    document.getElementById('upload-title').value = '';
    document.getElementById('upload-desc').value = '';
    document.getElementById('upload-category').value = '';
    removeThumbnail({ stopPropagation: function(){} });

    showToast(completed + ' file(s) uploaded successfully', 'success');

    setTimeout(function() {
        btn.disabled = false;
        progressEl.classList.add('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
    }, 1500);

    await loadFiles();
}

// ===== File Viewer =====
function openFileViewer(fileId) {
    var file = allFiles.find(function(f) { return f.id === fileId; });
    if (!file) return;

    console.log('Opening file:', file);

    currentViewerFile = file;
    var viewer = document.getElementById('file-viewer');
    var body = document.getElementById('viewer-body');
    var titleEl = document.getElementById('viewer-title');
    var meta = document.getElementById('viewer-meta');

    titleEl.textContent = file.title;

    var url = file.download_url;
    var ftype = file.file_type;
    var fname = (file.file_name || '').toLowerCase();

    if (ftype === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(fname)) {
        body.innerHTML = '<img src="' + url + '" alt="' + escapeHtml(file.title) + '" style="max-width:100%;max-height:70vh;cursor:zoom-in" onclick="this.style.maxHeight=this.style.maxHeight===\'100vh\'?\'70vh\':\'100vh\';this.style.cursor=this.style.cursor===\'zoom-out\'?\'zoom-in\':\'zoom-out\'">';
    } else if (ftype === 'video' || /\.(mp4|webm|avi|mov|mkv|flv|wmv)$/.test(fname)) {
        body.innerHTML = '<video controls playsinline style="max-width:100%;max-height:70vh"><source src="' + url + '">Your browser does not support video playback.</video>';
    } else if (ftype === 'pdf' || /\.pdf$/.test(fname)) {
        body.innerHTML = '<iframe src="' + url + '" style="width:100%;min-height:70vh;border:none;border-radius:8px" title="' + escapeHtml(file.title) + '"></iframe>';
    } else if (ftype === 'text' || /\.(txt|md|csv|json|xml|html|css|js|py|java|cpp|c|h)$/.test(fname)) {
        loadTextContent(url, body);
    } else {
        body.innerHTML = '<iframe src="' + url + '" style="width:100%;min-height:70vh;border:none;border-radius:8px" title="' + escapeHtml(file.title) + '"></iframe>';
    }

    meta.innerHTML = '<span>Type: ' + file.file_type.toUpperCase() + '</span>' +
        '<span>Size: ' + formatFileSize(file.file_size) + '</span>' +
        '<span>Uploaded by: ' + escapeHtml(file.uploader_name) + '</span>' +
        '<span>Date: ' + formatDate(file.created_at) + '</span>';

    var editBtn = document.getElementById('viewer-edit-btn');
    var downloadBtn = document.getElementById('viewer-download-btn');
    if (isAdmin()) {
        editBtn.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
    } else {
        editBtn.classList.add('hidden');
        downloadBtn.classList.add('hidden');
    }

    viewer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    loadComments(fileId);
    document.getElementById('comments-section').classList.remove('hidden');
}

async function loadTextContent(url, container) {
    try {
        var response = await fetch(url);
        var text = await response.text();
        container.innerHTML = '<pre>' + escapeHtml(text) + '</pre>';
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\uD83D\uDCC4</div><h3>Could not load text</h3></div>';
    }
}

function closeFileViewer() {
    document.getElementById('file-viewer').classList.add('hidden');
    document.getElementById('comments-section').classList.add('hidden');
    document.body.style.overflow = '';
    currentViewerFile = null;
}

function downloadFile() {
    if (!currentViewerFile) return;
    var link = document.createElement('a');
    link.href = currentViewerFile.download_url;
    link.download = currentViewerFile.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function editFromFileViewer() {
    if (!currentViewerFile) return;
    closeFileViewer();
    openEditModal(currentViewerFile.id);
}

// ===== Edit =====
function openEditModal(fileId) {
    var file = allFiles.find(function(f) { return f.id === fileId; });
    if (!file) return;

    document.getElementById('edit-file-id').value = file.id;
    document.getElementById('edit-title').value = file.title;
    document.getElementById('edit-desc').value = file.description || '';
    document.getElementById('edit-category').value = file.category || '';
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function handleEditSave(e) {
    e.preventDefault();
    var id = document.getElementById('edit-file-id').value;
    var title = document.getElementById('edit-title').value;
    var description = document.getElementById('edit-desc').value;
    var category = document.getElementById('edit-category').value;

    try {
        var result = await dbUpdate('files', {
            title: title,
            description: description,
            category: category
        }, [{ col: 'id', val: id }]);

        if (result.error) throw result.error;

        showToast('File updated successfully', 'success');
        closeEditModal();
        await loadFiles();
        renderManageFiles();
    } catch (err) {
        showToast('Error updating file', 'error');
    }
}

// ===== Delete =====
function openDeleteModal(fileId, fileName) {
    document.getElementById('delete-file-id').value = fileId;
    document.getElementById('delete-file-name').textContent = fileName;
    document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
    var id = document.getElementById('delete-file-id').value;
    var file = allFiles.find(function(f) { return f.id === id; });

    if (!file) return;

    try {
        // Delete from Storage
        if (file.file_path) {
            await supabase.storage.from('files').remove([file.file_path]);
        }

        // Delete comments
        await dbDelete('comments', [{ col: 'file_id', val: id }]);

        // Delete file record
        var result = await dbDelete('files', [{ col: 'id', val: id }]);
        if (result.error) throw result.error;

        showToast('File deleted successfully', 'success');
        closeDeleteModal();
        await loadFiles();
        renderManageFiles();
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Error deleting file', 'error');
    }
}

// ===== Comments =====
async function loadComments(fileId) {
    var container = document.getElementById('comments-list');
    var countEl = document.getElementById('comment-count');

    try {
        var result = await dbSelect('comments', [{ col: 'file_id', val: fileId }], 'created_at', true);
        if (result.error) throw result.error;

        var comments = result.data || [];
        countEl.textContent = comments.length;

        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);font-size:13px;padding:12px;">No comments yet. Be the first to comment!</p>';
            return;
        }

        container.innerHTML = comments.map(function(comment) {
            var deleteBtn = canDeleteComment(comment) ?
                '<button class="comment-delete" onclick="deleteComment(\'' + fileId + '\', \'' + comment.id + '\')" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>' : '';

            return '<div class="comment-item">' +
                '<div class="comment-avatar">' + (comment.author_name || 'U').charAt(0).toUpperCase() + '</div>' +
                '<div class="comment-body">' +
                '<span class="comment-author">' + escapeHtml(comment.author_name || 'Unknown') + '</span>' +
                '<p class="comment-text">' + escapeHtml(comment.text) + '</p>' +
                '<span class="comment-time">' + formatDate(comment.created_at) + '</span>' +
                '</div>' + deleteBtn + '</div>';
        }).join('');

        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error('Error loading comments:', err);
    }
}

function canDeleteComment(comment) {
    if (!currentUser) return false;
    return isAdmin() || comment.author_id === currentUser.uid;
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!currentViewerFile || !currentUser) return;

    var input = document.getElementById('comment-input');
    var text = input.value.trim();
    if (!text) return;

    input.value = '';

    try {
        var result = await dbInsert('comments', {
            file_id: currentViewerFile.id,
            text: text,
            author_id: currentUser.uid,
            author_name: currentUserData.name || currentUser.email
        });
        if (result.error) throw result.error;
        await loadComments(currentViewerFile.id);
    } catch (err) {
        showToast('Error posting comment', 'error');
    }
}

async function deleteComment(fileId, commentId) {
    try {
        var result = await dbDelete('comments', [{ col: 'id', val: commentId }]);
        if (result.error) throw result.error;
        await loadComments(fileId);
    } catch (err) {
        showToast('Error deleting comment', 'error');
    }
}

// ===== Utility Functions =====
function getFileType(filename) {
    var ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].indexOf(ext) !== -1) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].indexOf(ext) !== -1) return 'image';
    if (['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv'].indexOf(ext) !== -1) return 'video';
    if (['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'h'].indexOf(ext) !== -1) return 'text';
    return 'other';
}

function getFileClass(type) {
    var classes = { pdf: 'file-type-pdf', image: 'file-type-image', video: 'file-type-video', text: 'file-type-text' };
    return classes[type] || 'file-type-other';
}

function getFileEmoji(type) {
    var emojis = { pdf: 'PDF', image: 'IMG', video: 'VID', text: 'TXT' };
    return emojis[type] || 'FILE';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    var date = new Date(dateStr);
    var now = new Date();
    var diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var icons = { success: '\u2713', error: '\u2715', info: '\u2139' };

    toast.innerHTML = '<span>' + (icons[type] || '\u2139') + '</span> ' + message;
    container.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(function() { toast.remove(); }, 300);
    }, 5000);
}
