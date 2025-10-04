// UI State Management
        const UI_STATES = {
            LANDING: 'LANDING',
            AUTH_LOGIN: 'AUTH_LOGIN',
            AUTH_REGISTER: 'AUTH_REGISTER',
            AUTH_RECOVERY: 'AUTH_RECOVERY',
            MAIN_APP: 'MAIN_APP'
        };

        function getRoleIcon(role) {
            const icons = {
                greenhouse: '🏡',
                sorting: '🏭', 
                driver: '🚚',
                farmer: '🧑‍🌾',
                buyer: '🛒'
            };
            return icons[role] || '👤'; // Default icon
        }

        function updateUiState(state) {
            const landingPage = document.getElementById('soodcity-landing-page');
            const authScreen = document.getElementById('auth-screen');
            const mainApp = document.getElementById('main-app');
            const bottomNav = document.getElementById('bottom-nav');
            
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const recoveryForm = document.getElementById('password-recovery-form');

            // Reset all displays
            landingPage.style.display = 'none';
            authScreen.style.display = 'none';
            mainApp.style.display = 'none';
            bottomNav.classList.add('hidden'); // Hide nav by default
            mainApp.style.paddingBottom = '0'; // Reset padding
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            recoveryForm.style.display = 'none';
            
            document.body.className = ''; // Clear body classes

            switch(state) {
                case UI_STATES.LANDING:
                    landingPage.style.display = 'block';
                    document.body.className = 'gradient-bg min-h-screen';
                    break;
                case UI_STATES.AUTH_LOGIN:
                    authScreen.style.display = 'flex';
                    loginForm.style.display = 'block';
                    document.body.className = 'gradient-bg min-h-screen';
                    break;
                case UI_STATES.AUTH_REGISTER:
                    authScreen.style.display = 'flex';
                    registerForm.style.display = 'block';
                    document.body.className = 'gradient-bg min-h-screen';
                    break;
                case UI_STATES.AUTH_RECOVERY:
                    authScreen.style.display = 'flex';
                    recoveryForm.style.display = 'block';
                    document.body.className = 'gradient-bg min-h-screen';
                    break;
                case UI_STATES.MAIN_APP:
                    mainApp.style.display = 'block';
                    bottomNav.classList.remove('hidden'); // Show nav for main app
                    mainApp.style.paddingBottom = '80px'; // Add padding for nav
                    document.body.className = 'bg-gray-100';
                    break;
            }
        }
        
        let supplyAds = [];
        let demandAds = [];

        let activeFilters = {
            province: 'all',
            spicy: false
        };

        function applySpicyFilter(prefix) {
            if (!currentUser || !currentUser.location) {
                showToast('برای استفاده از این فیلتر باید وارد شده و موقعیت مکانی خود را ثبت کنید.', 'error');
                return;
            }
            activeFilters.spicy = true;
            activeFilters.province = 'all'; // Reset province filter
            
            // Visually update controls
            document.getElementById(`${prefix}-spicy-filter`).classList.add('ring-2', 'ring-white');

            applyMarketFilters(true, prefix);
            showToast('فیلتر شعاع ۱۰۰ کیلومتر فعال شد.', 'success');
        }

        function resetMarketFilters(prefix) {
            activeFilters.spicy = false;
            activeFilters.province = 'all';

            // Visually update controls
            document.getElementById(`${prefix}-spicy-filter`).classList.remove('ring-2', 'ring-white');
            
            applyMarketFilters(true, prefix);
            showToast('فیلترها پاک شدند.', 'info');
        }

        function applyMarketFilters(showContactButton = false, prefix) {
            if (!prefix) {
                console.error("applyMarketFilters called without a prefix! Cannot update marketplace.");
                return; 
            }

            let filteredSupply = [...supplyAds];
            let filteredDemand = [...demandAds];

            // Province filter
            if (activeFilters.province !== 'all') {
                filteredSupply = filteredSupply.filter(ad => {
                    const seller = users.find(u => u.id === ad.sellerId);
                    return seller && seller.province === activeFilters.province;
                });
                filteredDemand = filteredDemand.filter(ad => {
                    const buyer = users.find(u => u.id === ad.buyerId);
                    return buyer && buyer.province === activeFilters.province;
                });
            }

            // Spicy (Radius) filter
            if (activeFilters.spicy && currentUser && currentUser.location) {
                filteredSupply = filteredSupply.filter(ad => {
                    const seller = users.find(u => u.id === ad.sellerId);
                    if (!seller || !seller.location) return false;
                    const distance = calculateDistance(currentUser.location, seller.location);
                    return distance <= 100;
                });
                filteredDemand = filteredDemand.filter(ad => {
                    const buyer = users.find(u => u.id === ad.buyerId);
                    if (!buyer || !buyer.location) return false;
                    const distance = calculateDistance(currentUser.location, buyer.location);
                    return distance <= 100;
                });
            }

            const supplyGridId = `${prefix}-supply-grid`;
            const supplyCountId = `${prefix}-supply-count`;
            const demandGridId = `${prefix}-demand-grid`;
            const demandCountId = `${prefix}-demand-count`;

            renderSupplyAds(showContactButton, filteredSupply, supplyGridId, supplyCountId);
            renderDemandAds(showContactButton, filteredDemand, demandGridId, demandCountId);
        }

        function renderMarketplace(containerId, theme = 'light') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Marketplace container with id ${containerId} not found.`);
                return;
            }

            const prefix = containerId;
            const isDark = theme === 'dark';

            const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
            const textColor = isDark ? 'text-white' : 'text-gray-900';
            const cardBgColor = isDark ? 'bg-gray-900' : 'bg-gray-50';
            const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
            const titleColor = isDark ? 'text-white' : 'text-gray-900';
            const filterBgColor = isDark ? 'bg-gray-700' : 'bg-gray-200';
            const filterTextColor = isDark ? 'text-white' : 'text-gray-800';
            const filterBorderColor = isDark ? 'border-gray-600' : 'border-gray-300';

            // --- Dynamic Filter Generation ---
            const provinces = [
                { value: "all", name: "همه استان‌ها" }, { value: "Tehran", name: "تهران" },
                { value: "Qom", name: "قم" }, { value: "Markazi", name: "مرکزی" },
                { value: "Qazvin", name: "قزوین" }, { value: "Gilan", name: "گیلان" },
                { value: "Ardabil", name: "اردبیل" }, { value: "Zanjan", name: "زنجان" },
                { value: "East Azerbaijan", name: "آذربایجان شرقی" }, { value: "West Azerbaijan", name: "آذربایجان غربی" },
                { value: "Kurdistan", name: "کردستان" }, { value: "Hamadan", name: "همدان" },
                { value: "Kermanshah", name: "کرمانشاه" }, { value: "Ilam", name: "ایلام" },
                { value: "Lorestan", name: "لرستان" }, { value: "Khuzestan", name: "خوزستان" },
                { value: "Chaharmahal and Bakhtiari", name: "چهارمحال و بختیاری" }, { value: "Kohgiluyeh and Boyer-Ahmad", name: "کهگیلویه و بویراحمد" },
                { value: "Bushehr", name: "بوشهر" }, { value: "Fars", name: "فارس" },
                { value: "Hormozgan", name: "هرمزگان" }, { value: "Sistan and Baluchestan", name: "سیستان و بلوچستان" },
                { value: "Kerman", name: "کرمان" }, { value: "Razavi Khorasan", name: "خراسان رضوی" },
                { value: "North Khorasan", name: "خراسان شمالی" }, { value: "South Khorasan", name: "خراسان جنوبی" },
                { value: "Semnan", name: "سمنان" }, { value: "Mazandaran", name: "مازندران" },
                { value: "Golestan", name: "گلستان" }, { value: "Alborz", name: "البرز" },
                { value: "Isfahan", name: "اصفهان" }, { value: "Yazd", name: "یزد" }
            ];

            const provinceOptions = provinces.map(p =>
                `<option value="${p.value}" ${activeFilters.province === p.value ? 'selected' : ''}>${p.name}</option>`
            ).join('');

            const spicyButtonClasses = activeFilters.spicy ? 'ring-2 ring-white' : '';
            // --- End Dynamic Filter Generation ---

            // Main wrapper for the component
            const marketplaceWrapper = document.createElement('div');
            marketplaceWrapper.className = `p-6 rounded-xl card-shadow ${bgColor} ${textColor}`;

            const marketplaceHTML = `
                <h3 class="text-xl font-bold ${titleColor} mb-4 text-center flex items-center justify-center">
                    📊 بازار محصولات
                    <span class="text-sm bg-cyan-500 text-white px-3 py-1 rounded-full mr-3">زنده</span>
                </h3>

                <!-- Filter Controls -->
                <div class="flex flex-col sm:flex-row gap-4 mb-6">
                    <div class="flex-1">
                        <select id="${prefix}-province-filter" onchange="activeFilters.province = this.value; activeFilters.spicy = false; document.getElementById('${prefix}-spicy-filter').classList.remove('ring-2', 'ring-white'); applyMarketFilters(true, '${prefix}');" class="w-full px-4 py-2 ${filterBgColor} border ${filterBorderColor} rounded-lg ${filterTextColor} focus:outline-none focus:border-cyan-500 transition-colors">
                            ${provinceOptions}
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="${prefix}-spicy-filter" onclick="applySpicyFilter('${prefix}')" class="w-full sm:w-auto flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center ${spicyButtonClasses}">
                            <i class="fas fa-fire ml-2"></i> فلفلی
                        </button>
                         <button onclick="resetMarketFilters('${prefix}')" class="w-full sm:w-auto flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300">
                            <i class="fas fa-times ml-2"></i>
                        </button>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <!-- عرضه -->
                    <div class="${cardBgColor} border ${borderColor} rounded-xl p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-lg font-bold text-green-400 flex items-center">
                                📈 عرضه محصولات
                                <span class="text-xs bg-green-600 text-white px-2 py-1 rounded-full mr-2" id="${prefix}-supply-count">۰ آگهی</span>
                            </h4>
                        </div>
                        <div class="space-y-3" id="${prefix}-supply-grid" style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                            <!-- Populated by JS -->
                        </div>
                    </div>

                    <!-- تقاضا -->
                    <div class="${cardBgColor} border ${borderColor} rounded-xl p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-lg font-bold text-blue-400 flex items-center">
                                📉 تقاضای محصولات
                                <span class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full mr-2" id="${prefix}-demand-count">۰ آگهی</span>
                            </h4>
                        </div>
                        <div class="space-y-3" id="${prefix}-demand-grid" style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            `;
            
            marketplaceWrapper.innerHTML = marketplaceHTML;
            container.innerHTML = '';
            container.appendChild(marketplaceWrapper);

            // Initial render, which now respects the active filters
            applyMarketFilters(true, prefix);
        }

        function renderSupplyAds(showContactButton, adsToRender, gridId = 'supply-grid', countId = 'supply-count', theme = 'dark') {
            const grid = document.getElementById(gridId);
            const count = document.getElementById(countId);
            
            const isDark = theme === 'dark';
            const itemBg = isDark ? 'bg-white bg-opacity-5 hover:bg-opacity-10' : 'bg-gray-100 hover:bg-gray-200';
            const textColor = isDark ? 'text-white' : 'text-gray-800';
            const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';

            if (!grid || !count) {
                console.error(`Missing elements for rendering supply ads: gridId=${gridId}, countId=${countId}`);
                return;
            }
            
            if (adsToRender.length === 0) {
                grid.innerHTML = `<div class="text-center ${subTextColor} py-8"><div class="text-4xl mb-2">📦</div><p>هیچ آگهی عرضه‌ای یافت نشد</p></div>`;
                count.textContent = '۰ آگهی';
                return;
            }
            
            count.textContent = `${adsToRender.length.toLocaleString('fa-IR')} آگهی`;
            
            grid.innerHTML = adsToRender.map(ad => `
                <div class="product-item ${ad.category} ${itemBg} rounded-lg transition-all duration-300 p-3" style="animation: fadeIn 0.3s ease-in-out;">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            ${ad.image ? `<img src="${ad.image}" alt="${ad.product}" class="w-12 h-12 rounded-md object-cover ml-3 cursor-pointer hover:scale-105 transition-transform" onclick="showLightbox('${ad.image}')">` : `<span class="text-2xl ml-3">${ad.emoji}</span>`}
                            <div>
                                <span class="${textColor} text-sm font-medium">${ad.product}</span>
                                <div class="text-xs ${subTextColor}">${ad.seller}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 space-x-reverse">
                            ${showContactButton ? `${currentUser && currentUser.fullname === ad.seller ? `<button class="text-xs bg-red-600 text-white px-2 py-1 rounded-full hover:bg-red-700 transition-colors" onclick="deleteAd(${ad.id}, 'supply')">حذف</button>` : ''} ${currentUser && currentUser.fullname !== ad.seller ? `<button class="text-xs bg-green-600 text-white px-2 py-1 rounded-full hover:bg-green-700 transition-colors" onclick="openChatWindowByName('${ad.seller}', ${ad.id})">پیام</button>` : ''}` : ''}
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="${subTextColor}">موجودی: ${ad.quantity.toLocaleString('fa-IR')} کیلو</span>
                        <span class="text-green-400 font-bold">${ad.price.toLocaleString('fa-IR')} تومان/کیلو</span>
                    </div>
                </div>
            `).join('');
        }

        function renderDemandAds(showContactButton, adsToRender, gridId = 'demand-grid', countId = 'demand-count', theme = 'dark') {
            const grid = document.getElementById(gridId);
            const count = document.getElementById(countId);

            const isDark = theme === 'dark';
            const itemBg = isDark ? 'bg-white bg-opacity-5 hover:bg-opacity-10' : 'bg-gray-100 hover:bg-gray-200';
            const textColor = isDark ? 'text-white' : 'text-gray-800';
            const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';

            if (!grid || !count) {
                console.error(`Missing elements for rendering demand ads: gridId=${gridId}, countId=${countId}`);
                return;
            }
            
            if (adsToRender.length === 0) {
                grid.innerHTML = `<div class="text-center ${subTextColor} py-8"><div class="text-4xl mb-2">🛒</div><p>هیچ آگهی تقاضایی یافت نشد</p></div>`;
                count.textContent = '۰ آگهی';
                return;
            }
            
            count.textContent = `${adsToRender.length.toLocaleString('fa-IR')} آگهی`;
            
            grid.innerHTML = adsToRender.map(ad => `
                <div class="product-item ${ad.category} ${itemBg} rounded-lg transition-all duration-300 p-3" style="animation: fadeIn 0.3s ease-in-out;">
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            ${ad.image ? `<img src="${ad.image}" alt="${ad.product}" class="w-12 h-12 rounded-md object-cover ml-3 cursor-pointer hover:scale-105 transition-transform" onclick="showLightbox('${ad.image}')">` : `<span class="text-2xl ml-3">${ad.emoji}</span>`}
                            <div>
                                <span class="${textColor} text-sm font-medium">${ad.product}</span>
                                <div class="text-xs ${subTextColor}">${ad.buyer}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 space-x-reverse">
                             ${showContactButton ? `${currentUser && currentUser.fullname === ad.buyer ? `<button class="text-xs bg-red-600 text-white px-2 py-1 rounded-full hover:bg-red-700 transition-colors" onclick="deleteAd(${ad.id}, 'demand')">حذف</button>` : ''} ${currentUser && currentUser.fullname !== ad.buyer ? `<button class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full hover:bg-blue-700 transition-colors" onclick="openChatWindowByName('${ad.buyer}', ${ad.id})">پیام</button>` : ''}` : ''}
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="${subTextColor}">نیاز: ${ad.quantity.toLocaleString('fa-IR')} کیلو</span>
                        <span class="text-blue-400 font-bold">${ad.price.toLocaleString('fa-IR')} تومان/کیلو</span>
                    </div>
                </div>
            `).join('');
        }

        async function deleteAd(adId, type) {
            const ad = (type === 'supply' ? supplyAds : demandAds).find(a => a.id === adId);
            if (!ad) return;

            const response = await api.deleteAd(adId, type);

            if (response.success) {
                // Find conversations to delete and close any open chat windows
                const conversationsToDelete = messages.filter(msg => msg.adId === adId);
                const recipientIds = [...new Set(conversationsToDelete.map(m => m.senderId === currentUser.id ? m.recipientId : m.senderId))];
                
                recipientIds.forEach(recipientId => {
                    const conversationId = [currentUser.id, recipientId].sort().join('-');
                    if (activeChats[conversationId]) {
                        closeChatWindow(conversationId);
                    }
                });

                // The API call handles the data deletion. Now, we just need to refresh the client state.
                await loadDataFromServer();
                
                // Re-render the main page grids. The marketplace functions should handle this.
                applyMarketFilters(true);
                
                showToast('آگهی و پیام‌های مرتبط با آن با موفقیت حذف شدند', 'success');
            } else {
                showToast(response.message || 'خطا در حذف آگهی.', 'error');
            }
        }

        // Global Variables
        let tabId;
        let currentUser = null; // Will be set after loading all users from storage
        let users = [];
        let requests = [];
        let notifications = [];
        let messages = [];
        let driverMap = null;
        let greenhouseMap = null;
        let sortingMap = null;
        let farmerMap = null;
        let buyerMap = null;
        let driverMainMap = null;
        let selectedLocation = null;
        let tempSelectedLocation = null;
        let isLocationEditMode = false;
        let tempMarker = null;
        let driverLocationMarker = null;
        let routeControl = null;
        let driverWatcher = { id: null, type: null };
        let otherUserMarkers = [];
        let connections = [];
        let isFormActive = false; // Flag to prevent UI refresh when a form element is active
        let isNavigating = false; // Flag to pause refresh during any navigation
        const orsApiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIxMGZlYjc0NjIwMzQzOWE5ZDg0OGVjZGZiMTNjZmRlIiwiaCI6Im11cm11cjY0In0=';

        // Map layer management
        let mapLayers = {};

        function switchMapLayer(mapId, layerType) {
            const map = getMapInstance(mapId);
            if (!map) return;
            
            // Remove existing layers
            map.eachLayer(function(layer) {
                if (layer instanceof L.TileLayer) {
                    map.removeLayer(layer);
                }
            });
            
            // Add new layer
            let newLayer;
            if (layerType === 'satellite') {
                newLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: '© Esri'
                });
            } else {
                newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                });
            }
            
            newLayer.addTo(map);
            
            // Update button states
            const prefix = mapId.replace('-map', '');
            document.getElementById(`${prefix}-street-btn`).className = layerType === 'street' ? 
                'px-3 py-1 rounded text-sm bg-white shadow-sm' : 'px-3 py-1 rounded text-sm';
            document.getElementById(`${prefix}-satellite-btn`).className = layerType === 'satellite' ? 
                'px-3 py-1 rounded text-sm bg-white shadow-sm' : 'px-3 py-1 rounded text-sm';
        }

        function getMapInstance(mapId) {
            switch(mapId) {
                case 'greenhouse-map': return greenhouseMap;
                case 'sorting-map': return sortingMap;
                case 'driver-main-map': return driverMainMap;
                case 'farmer-map': return farmerMap;
                case 'buyer-map': return buyerMap;
                default: return null;
            }
        }

        async function handleDeleteAccount() {
            if (!currentUser) return;

            if (confirm('آیا مطمئن هستیذ؟ این عمل غیرقابل بازگشت است.')) {
                const response = await api.deleteAccount(currentUser.id);
                if (response.success) {
                    showToast('حساب کاربری شما با موفقیت حذف شد', 'info');
                    // The logout function handles clearing local state
                    await logout();
                } else {
                    showToast(response.message || 'خطا در حذف حساب کاربری.', 'error');
                }
            }
        }

        function renderProfilePage() {
            if (!currentUser) return;

            document.getElementById('profile-fullname').textContent = currentUser.fullname;
            document.getElementById('profile-phone').textContent = currentUser.phone;
            document.getElementById('profile-province').textContent = currentUser.province;
            document.getElementById('profile-role').textContent = getRoleTitle(currentUser.role);
            document.getElementById('profile-address').textContent = currentUser.address || '-';

            const licensePlateContainer = document.getElementById('profile-license-plate-container');
            if (currentUser.role === 'driver' && currentUser.licensePlate) {
                document.getElementById('profile-license-plate').textContent = currentUser.licensePlate;
                licensePlateContainer.classList.remove('hidden');
            } else {
                licensePlateContainer.classList.add('hidden');
            }
        }

        // Initialize App
        document.addEventListener('DOMContentLoaded', async function() {
            // Check for auth token on load
            const token = localStorage.getItem('token');
            if (token) {
                const authResponse = await api.getAuthUser(token);
                if (authResponse.success) {
                    currentUser = authResponse.user;
                    await showMainApp();
                } else {
                    // Token is invalid or expired
                    localStorage.removeItem('token');
                    updateUiState(UI_STATES.LANDING);
                }
            } else {
                // No token, show public view
                updateUiState(UI_STATES.LANDING);
            }
            
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            document.querySelectorAll('input[type="date"]').forEach(input => {
                input.value = today;
            });
            
            // Add event listeners for report filters
            document.getElementById('greenhouse-start-date-filter').addEventListener('change', filterGreenhouseReports);
            document.getElementById('greenhouse-end-date-filter').addEventListener('change', filterGreenhouseReports);
            document.getElementById('greenhouse-basket-type-filter').addEventListener('change', filterGreenhouseReports);
            
            document.getElementById('sorting-start-date-filter').addEventListener('change', filterSortingReports);
            document.getElementById('sorting-end-date-filter').addEventListener('change', filterSortingReports);
            document.getElementById('sorting-filter-type').addEventListener('change', filterSortingReports);
            document.getElementById('sorting-filter-name').addEventListener('input', filterSortingReports);
            document.getElementById('sorting-basket-type-filter').addEventListener('change', filterSortingReports);

            document.getElementById('driver-start-date-filter').addEventListener('change', filterDriverReports);
            document.getElementById('driver-end-date-filter').addEventListener('change', filterDriverReports);
            document.getElementById('driver-basket-type-filter').addEventListener('change', filterDriverReports);

            document.getElementById('farmer-start-date-filter').addEventListener('change', filterFarmerReports);
            document.getElementById('farmer-end-date-filter').addEventListener('change', filterFarmerReports);

            document.getElementById('buyer-start-date-filter').addEventListener('change', filterBuyerReports);
            document.getElementById('buyer-end-date-filter').addEventListener('change', filterBuyerReports);

            // Add focus/blur listeners to all form inputs to manage the refresh flag
            document.querySelectorAll('input, textarea, select').forEach(el => {
                el.addEventListener('focus', () => { isFormActive = true; });
                el.addEventListener('blur', () => { isFormActive = false; });
            });

            // --- Sidebar Functionality ---
            const menuBtn = document.getElementById('menu-btn');
            const closeSidebarBtn = document.getElementById('close-sidebar-btn');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            
            const menuDashboard = document.getElementById('menu-dashboard');
            const menuProfile = document.getElementById('menu-profile');
            const menuChangePassword = document.getElementById('menu-change-password');
            const menuDeleteAccount = document.getElementById('menu-delete-account');
            const menuAbout = document.getElementById('menu-about');
            const menuContact = document.getElementById('menu-contact');
            const menuDownloadApp = document.getElementById('menu-download-app');

            const allPanels = document.querySelectorAll('.panel');
            const allPages = document.querySelectorAll('.page-container');

            function openSidebar() {
                sidebar.classList.add('open', 'manually-opened');
                overlay.classList.remove('hidden');
                setTimeout(() => overlay.classList.add('opacity-50'), 10); // Timeout for transition
            }

            function closeSidebar() {
                sidebar.classList.remove('open', 'manually-opened');
                overlay.classList.remove('opacity-50');
                setTimeout(() => overlay.classList.add('hidden'), 300); // Hide after transition
            }

            function showPage(pageId) {
                allPanels.forEach(p => p.classList.add('hidden'));
                allPages.forEach(p => p.classList.add('hidden'));
                
                const pageToShow = document.getElementById(pageId);
                if (pageToShow) {
                    pageToShow.classList.remove('hidden');
                }
                closeSidebar();
            }

            function showDashboard() {
                allPages.forEach(p => p.classList.add('hidden'));
                // This re-uses the existing logic to show the correct role-based panel
                if(currentUser) {
                    showPanel(currentUser.role);
                }
                closeSidebar();
            }

            if (menuBtn) {
                menuBtn.addEventListener('click', openSidebar);
                closeSidebarBtn.addEventListener('click', closeSidebar);
                overlay.addEventListener('click', closeSidebar);

                menuDashboard.addEventListener('click', (e) => {
                    e.preventDefault();
                    showDashboard();
                });
                menuProfile.addEventListener('click', (e) => {
                    e.preventDefault();
                    renderProfilePage();
                    showPage('profile-page');
                });
                menuChangePassword.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage('change-password-page');
                });
                menuDeleteAccount.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage('delete-account-page');
                });
                menuAbout.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage('about-page');
                });
                menuContact.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage('contact-page');
                });

                menuDownloadApp.addEventListener('click', (e) => {
                    e.preventDefault();
                    showPage('download-app-page');
                });
            }

            window.addEventListener('resize', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open') && !sidebar.classList.contains('manually-opened')) {
                    closeSidebar();
                }
            });

            // --- Accordion Functionality ---
            document.querySelectorAll('.accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const accordionItem = header.parentElement;
                    const accordionContent = header.nextElementSibling;
                    const isOpening = !accordionItem.classList.contains('open');

                    if (isOpening) {
                        accordionItem.classList.add('open');
                        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
                        
                        // Mark items as "seen" when accordion opens
                        const contentDiv = accordionContent.querySelector('div[id]');
                        if (contentDiv) {
                            const contentId = contentDiv.id;
                            let itemsToMarkAsSeen = [];

                            if (currentUser.role === 'sorting') {
                                if (contentId === 'sorting-pending-requests') {
                                    itemsToMarkAsSeen = requests.filter(r =>
                                        r.sortingCenterId === currentUser.id && r.status === 'pending'
                                    );
                                } else if (contentId === 'sorting-connection-requests') {
                                    itemsToMarkAsSeen = connections.filter(c =>
                                        c.targetId === currentUser.id && c.status === 'pending'
                                    );
                                }
                            } else if (currentUser.role === 'driver') {
                                if (contentId === 'driver-pending-requests') {
                                    itemsToMarkAsSeen = requests.filter(r =>
                                        r.driverId === currentUser.id && r.status === 'assigned'
                                    );
                                }
                            }

                            if (itemsToMarkAsSeen.length > 0) {
                                const newIds = itemsToMarkAsSeen.map(item => item.id);
                                newIds.forEach(id => {
                                    if (!seenItemIds.includes(id)) {
                                        seenItemIds.push(id);
                                    }
                                });
                                // Recalculate and update all badges immediately
                                updateAllNotifications();
                            }
                        }

                    } else {
                        accordionItem.classList.remove('open');
                        accordionContent.style.maxHeight = null;
                    }
                });
            });

            // --- Bottom Nav Tab Switching ---
            const navReceiveBtn = document.getElementById('nav-receive');
            const navSendBtn = document.getElementById('nav-send');

            if (navReceiveBtn && navSendBtn) {
                navReceiveBtn.addEventListener('click', () => {
                    // Update button styles
                    navReceiveBtn.classList.add('border-cyan-500', 'text-cyan-400');
                    navReceiveBtn.classList.remove('border-transparent', 'text-gray-400');
                    navSendBtn.classList.add('border-transparent', 'text-gray-400');
                    navSendBtn.classList.remove('border-cyan-500', 'text-cyan-400');

                    // Show/hide pages and scroll
                    if (currentUser) {
                        const receivePage = document.getElementById(`${currentUser.role}-receive-page`);
                        const sendPage = document.getElementById(`${currentUser.role}-send-page`);
                        if (receivePage && sendPage) {
                            receivePage.classList.remove('hidden');
                            sendPage.classList.add('hidden');
                            // Scroll to the top of the content area
                            receivePage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });

                navSendBtn.addEventListener('click', () => {
                    // Update button styles
                    navSendBtn.classList.add('border-cyan-500', 'text-cyan-400');
                    navSendBtn.classList.remove('border-transparent', 'text-gray-400');
                    navReceiveBtn.classList.add('border-transparent', 'text-gray-400');
                    navReceiveBtn.classList.remove('border-cyan-500', 'text-cyan-400');

                    // Show/hide pages and scroll
                     if (currentUser) {
                        const receivePage = document.getElementById(`${currentUser.role}-receive-page`);
                        const sendPage = document.getElementById(`${currentUser.role}-send-page`);
                        if (receivePage && sendPage) {
                            sendPage.classList.remove('hidden');
                            receivePage.classList.add('hidden');
                             // Scroll to the top of the content area
                            sendPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });
            }
        });

        async function loadDataFromServer() {
            console.log('Getting initial data from server...');
            try {
                // Use the new API getter methods for consistency and centralized logic.
                const [usersRes, requestsRes, adsRes, connectionsRes, messagesRes] = await Promise.all([
                    api.getAllUsers(),
                    api.getAllRequests(),
                    api.getAllAds(),
                    api.getAllConnections(),
                    api.getAllMessages()
                ]);

                // The _fetch helper returns { success: false, ... } on any error, including 401.
                const results = [usersRes, requestsRes, adsRes, connectionsRes, messagesRes];
                if (results.some(res => !res.success)) {
                    const errorResult = results.find(res => !res.success);
                    showToast(errorResult.message || 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.', 'error');
                    await logout();
                    return;
                }

                // Assuming the backend nests array responses within a key, e.g., { users: [...] }
                // This aligns with how the login response provides a 'user' object.
                users = usersRes.users || [];
                requests = requestsRes.requests || [];
                const allAds = adsRes.ads || [];
                connections = connectionsRes.connections || [];
                messages = messagesRes.messages || [];

                supplyAds = allAds.filter(ad => ad.adType === 'supply');
                demandAds = allAds.filter(ad => ad.adType === 'demand');

            } catch (error) {
                console.error("Failed to load data from server:", error);
                showToast('خطا در بارگذاری اطلاعات از سرور.', 'error');
            }
        }

       // --- API ---
const API_BASE_URL = 'https://soodcity.liara.run/api';


        const api = {
            async _fetch(url, options = {}) {
                const token = localStorage.getItem('token');
                const headers = {
                    'Content-Type': 'application/json',
                    ...options.headers,
                };
                if (token) {
                    headers['x-auth-token'] = token;
                }

                try {
                    const response = await fetch(url, { ...options, headers });
                    const data = await response.json();
                    if (!response.ok) {
                        return { success: false, message: data.msg || data.message || `خطای سرور: ${response.status}` };
                    }
                    return { success: true, ...data };
                } catch (err) {
                    console.error(`API call to ${url} failed:`, err);
                    return { success: false, message: 'خطا در ارتباط با سرور' };
                }
            },

            // --- Authentication ---
            async register(userData) {
                return this._fetch(`${API_BASE_URL}/users/register`, { method: 'POST', body: JSON.stringify(userData) });
            },
            async login(phone, password) {
                return this._fetch(`${API_BASE_URL}/users/login`, { method: 'POST', body: JSON.stringify({ phone, password }) });
            },
            async getAuthUser() {
                 return this._fetch(`${API_BASE_URL}/users/auth`);
            },
            async deleteAccount() {
                return this._fetch(`${API_BASE_URL}/users`, { method: 'DELETE' });
            },
            async changePassword(currentPassword, newPassword) {
                return this._fetch(`${API_BASE_URL}/users/password`, { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
            },
            async updateUser(updates) {
                return this._fetch(`${API_BASE_URL}/users`, { method: 'PUT', body: JSON.stringify(updates) });
            },
            async resetPassword(phone, newPassword) {
                // This endpoint needs to be implemented on the backend
                return this._fetch(`${API_BASE_URL}/users/reset-password`, { method: 'POST', body: JSON.stringify({ phone, newPassword }) });
            },

            // --- Ads ---
            async createAd(adData) {
                return this._fetch(`${API_BASE_URL}/ads`, { method: 'POST', body: JSON.stringify(adData) });
            },
            async deleteAd(adId) {
                return this._fetch(`${API_BASE_URL}/ads/${adId}`, { method: 'DELETE' });
            },

            // --- Messages ---
            async createMessage(messageData) {
                return this._fetch(`${API_BASE_URL}/messages`, { method: 'POST', body: JSON.stringify(messageData) });
            },
            async deleteConversation(conversationId) {
                return this._fetch(`${API_BASE_URL}/messages/conversation/${conversationId}`, { method: 'DELETE' });
            },
            async markConversationAsRead(conversationId) {
                 return this._fetch(`${API_BASE_URL}/messages/conversation/${conversationId}/read`, { method: 'PUT' });
            },
            
            // --- Connections ---
            async createConnection(targetId) {
                return this._fetch(`${API_BASE_URL}/connections`, { method: 'POST', body: JSON.stringify({ targetId }) });
            },
            async updateConnection(connectionId, status) {
                 return this._fetch(`${API_BASE_URL}/connections/${connectionId}`, { method: 'PUT', body: JSON.stringify({ status }) });
            },
            async deleteConnection(connectionId) {
                return this._fetch(`${API_BASE_URL}/connections/${connectionId}`, { method: 'DELETE' });
            },

            // --- Requests ---
            async createRequest(requestData) {
                return this._fetch(`${API_BASE_URL}/requests`, { method: 'POST', body: JSON.stringify(requestData) });
            },
            async updateRequest(requestId, updates) {
                return this._fetch(`${API_BASE_URL}/requests/${requestId}`, { method: 'PUT', body: JSON.stringify(updates) });
            },
            async deleteRequest(requestId) {
                return this._fetch(`${API_BASE_URL}/requests/${requestId}`, { method: 'DELETE' });
            },
            async createConsolidatedDelivery(missionsToConsolidate) {
                return this._fetch(`${API_BASE_URL}/requests/consolidate`, { method: 'POST', body: JSON.stringify({ missionIds: missionsToConsolidate.map(m => m.id) }) });
            },
            async rejectConsolidatedDelivery(deliveryRequestId, reason) {
                return this._fetch(`${API_BASE_URL}/requests/${deliveryRequestId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
            },
            async getAllRequests() {
                return { success: true, requests: [] };
            },

            // --- Getters for loadDataFromServer ---
            async getAllUsers() { return this._fetch(`${API_BASE_URL}/users`); },
            async getAllAds() {
                return { success: true, ads: [] };
            },
            async getAllConnections() { return this._fetch(`${API_BASE_URL}/connections`); },
            async getAllMessages() {
                return { success: true, messages: [] };
            }
        };


        // --- End API ---

        // Authentication Functions
        function showRoleSelection() {
            updateUiState(UI_STATES.LANDING);
        }

        function selectRoleAndProceed(role) {
            document.getElementById('role-selection-modal').classList.add('hidden');
            updateUiState(UI_STATES.AUTH_REGISTER);
            
            const roleTitles = {
                greenhouse: 'گلخانه‌دار',
                sorting: 'مرکز سورتینگ',
                driver: 'راننده',
                farmer: 'کشاورز',
                buyer: 'خریدار'
            };
            document.getElementById('selected-role-title').textContent = roleTitles[role];
            document.getElementById('selected-role').value = role;

            const licensePlateField = document.getElementById('register-license-plate');
            if (role === 'driver') {
                licensePlateField.classList.remove('hidden');
            } else {
                licensePlateField.classList.add('hidden');
            }
        }

        function showLogin() {
            document.getElementById('role-selection-modal').classList.add('hidden');
            updateUiState(UI_STATES.AUTH_LOGIN);
            document.getElementById('recovery-result').classList.add('hidden');
            document.getElementById('recovery-phone').value = '';
        }

        function showPasswordRecovery() {
            updateUiState(UI_STATES.AUTH_RECOVERY);
            document.getElementById('recovery-result').classList.add('hidden');
            document.getElementById('recovery-phone').value = '';
        }

        async function handleRegister(event) {
            event.preventDefault();
            
            const role = document.getElementById('selected-role').value;
            const fullname = document.getElementById('register-fullname').value;
            const province = document.getElementById('register-province').value;
            const phone = document.getElementById('register-phone').value;
            const password = document.getElementById('register-password').value;
            const address = document.getElementById('register-address').value;
            const licensePlate = document.getElementById('register-license-plate').value;

            if (!role || !province) {
                showToast('لطفاً نقش و استان خود را انتخاب کنید', 'error');
                return;
            }

            const registrationData = { role, fullname, province, phone, password, address, licensePlate };
            const response = await api.register(registrationData);

            if (response.success && response.token) {
                localStorage.setItem('token', response.token);
                // The server returns the full user object on successful registration.
                // We can trust this and don't need to make another auth call.
                currentUser = response.user;
                showToast('ثبت نام با موفقیت انجام شد. در حال ورود...', 'success');
                await showMainApp();
            } else {
                showToast(response.message || 'خطا در ثبت نام. لطفاً دوباره تلاش کنید.', 'error');
            }
        }

        async function handleLogin(event) {
            event.preventDefault();
            
            const phone = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            const response = await api.login(phone, password);
            
            if (response.success && response.token && response.user) {
                localStorage.setItem('token', response.token);
                // The user object is returned directly from the login response.
                currentUser = response.user;
                await showMainApp();
            } else {
                showToast(response.message || 'نام کاربری یا رمز عبور اشتباه است', 'error');
            }
        }

        /* === OLD PASSWORD RECOVERY FUNCTIONS - COMMENTED OUT ===
        // NEW PASSWORD RECOVERY FUNCTIONS
        function handlePasswordRecovery(event) {
            event.preventDefault();
            loadDataFromStorage();
            const phone = document.getElementById('recovery-phone').value;
            const user = users.find(u => u.username === phone || u.phone === phone);

            if (user) {
                // In a real app, you would send an SMS here.
                // For this simulation, we'll store a mock verification code.
                const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                sessionStorage.setItem('recovery_code', verificationCode);
                sessionStorage.setItem('recovery_phone', phone);

                console.log(`کد تایید برای ${phone}: ${verificationCode}`); // For debugging
                showToast(`کد تایید (تستی): ${verificationCode}`, 'info');

                document.getElementById('recovery-phone-display').textContent = phone;
                document.getElementById('recovery-step-1').classList.add('hidden');
                document.getElementById('recovery-step-2').classList.remove('hidden');
            } else {
                showToast('کاربری با این شماره تلفن یافت نشد', 'error');
            }
        }

        function verifyRecoveryCode(event) {
            event.preventDefault();
            const code = document.getElementById('recovery-code').value;
            const newPassword = document.getElementById('recovery-new-password').value;
            const storedCode = sessionStorage.getItem('recovery_code');
            const phone = sessionStorage.getItem('recovery_phone');

            if (code === storedCode) {
                resetPassword(phone, newPassword);
            } else {
                showToast('کد تایید اشتباه است', 'error');
            }
        }

        function resetPassword(phone, newPassword) {
            loadDataFromStorage();
            const userIndex = users.findIndex(u => u.username === phone || u.phone === phone);
            if (userIndex !== -1) {
                users[userIndex].password = newPassword;
                saveDataToStorage();
                
                // Cleanup session storage
                sessionStorage.removeItem('recovery_code');
                sessionStorage.removeItem('recovery_phone');

                showToast('رمز عبور با موفقیت تغییر کرد. لطفاً با رمز جدید وارد شوید.', 'success');
                
                // Hide recovery form and show login form
                document.getElementById('recovery-step-2').classList.add('hidden');
                document.getElementById('recovery-step-1').classList.remove('hidden'); // Reset for next time
                showLogin();
            } else {
                // This case should ideally not be reached if checks are done properly
                showToast('خطا در بازیابی حساب. کاربر یافت نشد.', 'error');
            }
        }
        */

        // === NEW PASSWORD RECOVERY FUNCTIONS (FROM USER) ===
        async function handlePasswordRecovery(event) {
            event.preventDefault();
            await loadDataFromServer();
            const phone = document.getElementById('recovery-phone').value;
            const user = users.find(u => u.username === phone || u.phone === phone);

            if (user) {
                // Call the new function to send the SMS
                await sendVerificationSms(phone);

                // Show the next step in the UI
                document.getElementById('recovery-phone-display').textContent = phone;
                document.getElementById('recovery-step-1').classList.add('hidden');
                document.getElementById('recovery-step-2').classList.remove('hidden');
                document.getElementById('recovery-result').classList.add('hidden'); // Ensure result is hidden
            } else {
                showToast('کاربری با این شماره تلفن یافت نشد', 'error');
            }
        }

        async function sendVerificationSms(phoneNumber) {
            // This is a placeholder for your actual API call.
            // The user needs to replace the placeholders with their actual data.
            console.log(`Simulating sending SMS to ${phoneNumber}`);

            const API_ENDPOINT_URL = 'https://api.sms.ir/v1/send/verify'; // As per user's PHP example
            const YOUR_API_KEY = 'eCGjVdVxsFTHy9oNhTmpMC0e3R11dXkWPSbmmnMAC5u5Cbeb'; // User must replace this
            const YOUR_TEMPLATE_ID = 817766; // As per user's PHP example

            // For simulation, we generate a code here. In a real app, the backend generates and stores it.
            const verificationCode = Math.floor(1000 + Math.random() * 9000);
            // We'll store it in a temporary global variable for the next step.
            window.tempVerificationCode = verificationCode.toString();
            console.log(`Generated verification code: ${window.tempVerificationCode}`);


            
            // --- UNCOMMENT THIS SECTION TO USE THE REAL API CALL ---
            
            const payload = {
                mobile: phoneNumber,
                templateId: YOUR_TEMPLATE_ID,
                parameters: [
                    { name: 'CODE', value: verificationCode.toString() }
                ]
            };

            try {
                const response = await fetch(API_ENDPOINT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // sms.ir typically uses a custom header like 'X-API-KEY'.
                        // The user must confirm the correct header from their provider's documentation.
                        'X-API-KEY': YOUR_API_KEY 
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    // If the API call fails, show an error and stop.
                    showToast('خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.', 'error');
                    throw new Error(`API call failed with status: ${response.status}`);
                }

                const result = await response.json();
                console.log('SMS API Response:', result);
                showToast('کد تایید با موفقیت ارسال شد.', 'success');

            } catch (error) {
                console.error('Failed to send SMS:', error);
                // Even if the API fails, we continue in this simulation. 
                // In a real app, you might want to stop the user from proceeding.
            }
            
        }

        async function verifyRecoveryCode(event) {
            event.preventDefault();
            const enteredCode = document.getElementById('recovery-code').value;
            const phone = document.getElementById('recovery-phone').value; // Get the phone number again

            // In a real app, the server would verify the code. Here we simulate it.
            if (enteredCode === window.tempVerificationCode) {
                const newPassword = generateSecurePassword();
                const response = await api.resetPassword(phone, newPassword);

                if (response.success) {
                    // Hide the verification form and show the result
                    document.getElementById('recovery-step-2').classList.add('hidden');
                    document.getElementById('new-password').textContent = newPassword;
                    document.getElementById('recovery-result').classList.remove('hidden');

                    showToast('رمز عبور با موفقیت بازیابی شد.', 'success');
                } else {
                    showToast(response.message || 'خطا در بازیابی رمز عبور.', 'error');
                }
            } else {
                showToast('کد تایید وارد شده صحیح نیست.', 'error');
            }
        }

        function generateSecurePassword() {
            // Generate a secure 8-character password with numbers and letters
            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            let password = '';
            
            for (let i = 0; i < 8; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            return password;
        }

        async function handleChangePassword(event) {
            event.preventDefault();
            if (!currentUser) return;

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('change-new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            if (newPassword !== confirmNewPassword) {
                showToast('رمزهای عبور جدید با هم تطابق ندارند', 'error');
                return;
            }

            if (newPassword.length < 4) {
                showToast('رمز عبور جدید باید حداقل ۴ کاراکتر باشد', 'error');
                return;
            }
            
            const response = await api.changePassword(currentUser.id, currentPassword, newPassword);

            if (response.success) {
                // Update current user object's password in memory for the current session
                currentUser.password = newPassword;
                showToast('رمز عبور با موفقیت تغییر کرد', 'success');
                event.target.reset(); // Clear the form
            } else {
                showToast(response.message || 'خطا در تغییر رمز عبور.', 'error');
            }
        }

        function startGPSNavigation(request) {
            // This function no longer handles GPS directly.
            // It just tells the service worker to start.
            // The simulation fallback is now also handled by the main thread
            // based on GPS errors or lack of support.
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage('start-tracking');
            } else {
                // Fallback for when service worker isn't ready or supported
                console.log("Service worker not ready, falling back to simulated navigation for now.");
                if (request && request.routePath && request.routePath.length > 1) {
                    startSimulatedNavigation(request);
                }
            }
        }

        function moveAlongPath(path, currentLatLng, currentIndex, distanceToMove) {
            let remainingDistance = distanceToMove;

            for (let i = currentIndex; i < path.length - 1; i++) {
                const segmentStart = (i === currentIndex) ? currentLatLng : L.latLng(path[i]);
                const segmentEnd = L.latLng(path[i + 1]);
                const segmentDistance = segmentStart.distanceTo(segmentEnd);

                if (remainingDistance <= segmentDistance) {
                    const ratio = remainingDistance / segmentDistance;
                    if (segmentDistance === 0) return { latlng: segmentStart, newIndex: i }; // Avoid division by zero
                    
                    const newLat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio;
                    const newLng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio;
                    return {
                        latlng: L.latLng(newLat, newLng),
                        newIndex: i 
                    };
                } else {
                    remainingDistance -= segmentDistance;
                }
            }

            return {
                latlng: L.latLng(path[path.length - 1]),
                newIndex: path.length - 1
            };
        }

        function startSimulatedNavigation(request) {
            // isNavigating is already set to true by the calling function (startGPSNavigation)
            if (!request.routePath || !request.routePath.length || request.routePath.length < 2) {
                console.error("Not enough points in route path for simulation.");
                isNavigating = false; // Reset flag on error
                return;
            }

            request.routeIndex = request.routeIndex || 0;
            request.currentSimLatLng = request.currentSimLatLng || L.latLng(request.routePath[0]);

            const speed = 1000 / 60; // 60 km/h
            let lastTimestamp = performance.now();

            function animationLoop(timestamp) {
                if (driverWatcher.type !== 'simulation') {
                    isSimulatingNavigation = false; // Reset flag
                    return;
                }

                const deltaTime = (timestamp - lastTimestamp) / 1000;
                lastTimestamp = timestamp;
                const distanceToTravel = speed * deltaTime;

                const result = moveAlongPath(request.routePath, request.currentSimLatLng, request.routeIndex, distanceToTravel);
                
                request.currentSimLatLng = result.latlng;
                request.routeIndex = result.newIndex;
                
                const location = { lat: result.latlng.lat, lng: result.latlng.lng };
                
                // Manually update location in the main users array and localStorage
                const driverIndex = users.findIndex(u => u.id === currentUser.id);
                if (driverIndex !== -1) {
                    users[driverIndex].location = location;
                    localStorage.setItem('agritrack_users', JSON.stringify(users));
                }
                
                // Refresh the map on the current tab
                refreshAllMapMarkers();

                if (result.newIndex >= request.routePath.length - 1) {
                    clearDriverWatcher();
                } else {
                    requestAnimationFrame(animationLoop);
                }
            }
            
            driverWatcher = { id: true, type: 'simulation' };
            requestAnimationFrame(animationLoop);
        }

        async function logout() {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage('stop-tracking');
            }
            
            localStorage.removeItem('token');

            currentUser = null;
            dataSnapshot = {}; // Clear the notification snapshot
            seenItemIds = []; // Clear the seen items for badges
            
            // Clear all form fields
            document.querySelectorAll('input').forEach(input => {
                if (input.type !== 'button' && input.type !== 'submit') {
                    input.value = '';
                }
            });
            document.querySelectorAll('select').forEach(select => {
                select.selectedIndex = 0;
            });
            document.querySelectorAll('textarea').forEach(textarea => {
                textarea.value = '';
            });
            
            updateUiState(UI_STATES.LANDING);
        }

        // Location and Map Functions
        function toggleLocationEdit() {
            isLocationEditMode = !isLocationEditMode;
            
            if (isLocationEditMode) {
                // Show controls based on current panel
                if (currentUser.role === 'greenhouse') {
                    document.getElementById('location-controls').classList.remove('hidden');
                } else if (currentUser.role === 'sorting') {
                    document.getElementById('location-controls-sorting').classList.remove('hidden');
                } else if (currentUser.role === 'driver') {
                    document.getElementById('location-controls-driver').classList.remove('hidden');
                }
                
                // Enable map click for location selection
                const currentMap = getCurrentMap();
                if (currentMap) {
                    currentMap.on('click', onMapClick);
                    showToast('روی نقشه کلیک کنید تا موقعیت جدید را انتخاب کنید', 'info');
                }
            } else {
                cancelLocationEdit();
            }
        }

        function getCurrentMap() {
            if (currentUser.role === 'greenhouse') return greenhouseMap;
            if (currentUser.role === 'sorting') return sortingMap;
            if (currentUser.role === 'driver') return driverMainMap;
            if (currentUser.role === 'farmer') return farmerMap;
            if (currentUser.role === 'buyer') return buyerMap;
            return null;
        }

        function onMapClick(e) {
            if (!isLocationEditMode) return;
            
            const currentMap = getCurrentMap();
            if (!currentMap) return;
            
            // Remove previous temp marker
            if (tempMarker) {
                currentMap.removeLayer(tempMarker);
            }
            
            // Add new temp marker
            tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
                icon: L.divIcon({
                    className: 'temp-marker',
                    html: '<div style="background-color: #ef4444; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>',
                    iconSize: [25, 25],
                    iconAnchor: [12, 12]
                })
            }).addTo(currentMap);
            
            tempSelectedLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
        }

        function cancelLocationEdit() {
            isLocationEditMode = false;
            
            // Hide all controls
            document.getElementById('location-controls').classList.add('hidden');
            document.getElementById('location-controls-sorting').classList.add('hidden');
            document.getElementById('location-controls-driver').classList.add('hidden');
            
            // Remove temp marker
            const currentMap = getCurrentMap();
            if (currentMap && tempMarker) {
                currentMap.removeLayer(tempMarker);
                tempMarker = null;
            }
            
            // Remove click handler
            if (currentMap) {
                currentMap.off('click', onMapClick);
            }
            
            tempSelectedLocation = null;
        }

        async function saveLocationEdit() {
            if (!tempSelectedLocation) {
                showToast('لطفاً موقعیت جدید را روی نقشه انتخاب کنید', 'error');
                return;
            }

            const response = await api.updateUser(currentUser.id, { location: tempSelectedLocation });

            if (response.success) {
                currentUser.location = tempSelectedLocation;
                
                showToast('موقعیت با موفقیت به‌روزرسانی شد', 'success');
                cancelLocationEdit();
                
                // The storage event listener will handle broadcasting the update to other tabs.
                // We just need to update the current tab's maps.
                await loadDataFromServer();
                refreshAllMapMarkers();
                
            } else {
                showToast(response.message || 'خطا در ذخیره موقعیت.', 'error');
            }
        }

        function initializePanelMaps() {
            if (currentUser.role === 'greenhouse') {
                initializeGreenhouseMap();
            } else if (currentUser.role === 'sorting') {
                initializeSortingMap();
            } else if (currentUser.role === 'driver') {
                initializeDriverMainMap();
            } else if (currentUser.role === 'farmer') {
                initializeFarmerMap();
            } else if (currentUser.role === 'buyer') {
                initializeBuyerMap();
            }
        }
function initializeGreenhouseMap() {
            setTimeout(() => {
                if (!greenhouseMap) {
                    greenhouseMap = L.map('greenhouse-map').setView([currentUser.location.lat, currentUser.location.lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(greenhouseMap);
                    greenhouseMap.userMarkers = {};
                    
                    const userMarker = L.marker([currentUser.location.lat, currentUser.location.lng], {
                        icon: getMarkerIcon('greenhouse', currentUser, false)
                    })
                    .addTo(greenhouseMap)
                    .bindPopup(getMarkerPopupContent(currentUser, false, true))
                    .openPopup();
                    greenhouseMap.userMarkers[currentUser.id] = userMarker;
                    
                    addOtherUsersToMap(greenhouseMap);
                } else {
                    greenhouseMap.invalidateSize();
                }
            }, 100);
        }

        function initializeSortingMap() {
            setTimeout(() => {
                if (!sortingMap) {
                    sortingMap = L.map('sorting-map').setView([currentUser.location.lat, currentUser.location.lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(sortingMap);
                    sortingMap.userMarkers = {};
                    
                    const userMarker = L.marker([currentUser.location.lat, currentUser.location.lng], {
                        icon: getMarkerIcon('sorting', currentUser, false)
                    })
                    .addTo(sortingMap)
                    .bindPopup(getMarkerPopupContent(currentUser, false, true))
                    .openPopup();
                    sortingMap.userMarkers[currentUser.id] = userMarker;

                    addOtherUsersToMap(sortingMap);
                } else {
                    sortingMap.invalidateSize();
                }
            }, 100);
        }

        function initializeDriverMainMap() {
            if (driverMainMap) {
                driverMainMap.invalidateSize();
                return;
            }

            const onLocationReady = async (lat, lng) => {
                createDriverMap(lat, lng);
                const activeMission = requests.find(r => 
                    r.driverId === currentUser.id && 
                    ['in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status)
                );
                if (activeMission) {
                    await updateRoute(activeMission, driverMainMap);
                    startGPSNavigation(activeMission);
                }
            };

            const requestLocation = () => {
                navigator.geolocation.getCurrentPosition(
                    (position) => { // SUCCESS
                        currentUser.location = { lat: position.coords.latitude, lng: position.coords.longitude };
                        updateDriverLocationInStorage();
                        broadcastUserUpdate(currentUser.id);
                        onLocationReady(position.coords.latitude, position.coords.longitude);
                    },
                    (error) => { // ERROR
                        console.log('GPS Error:', error);
                        let toastMessage = 'دسترسی به موقعیت مکانی ممکن نیست. ';
                        if (!currentUser.location) {
                            currentUser.location = { lat: 35.6892, lng: 51.3890 }; // Default to Tehran
                            updateDriverLocationInStorage();
                            toastMessage += 'از موقعیت پیش‌فرض استفاده می‌شود.';
                        } else {
                            toastMessage += 'از آخرین موقعیت شناخته‌شده استفاده می‌شود.';
                        }
                        showToast(toastMessage, 'error');
                        onLocationReady(currentUser.location.lat, currentUser.location.lng);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                );
            };

            if (!navigator.geolocation) {
                showToast('مرورگر شما از GPS پشتیبانی نمی‌کند', 'error');
                if (!currentUser.location) currentUser.location = { lat: 35.6892, lng: 51.3890 };
                onLocationReady(currentUser.location.lat, currentUser.location.lng);
                return;
            }

            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                if (permissionStatus.state === 'granted') {
                    requestLocation();
                } else if (permissionStatus.state === 'prompt') {
                    showPermissionModal({
                        icon: '<i class="fas fa-map-marker-alt text-red-500"></i>',
                        title: 'دسترسی به موقعیت مکانی',
                        body: 'برای نمایش موقعیت شما روی نقشه، مسیریابی و پیدا کردن نزدیک‌ترین ماموریت‌ها، نیاز به اجازه دسترسی به موقعیت مکانی شما داریم.',
                        onAgree: requestLocation,
                        onDisagree: () => {
                            if (!currentUser.location) currentUser.location = { lat: 35.6892, lng: 51.3890 };
                            onLocationReady(currentUser.location.lat, currentUser.location.lng);
                        }
                    });
                } else { // denied
                    showToast('دسترسی به موقعیت مکانی مسدود است. لطفاً از تنظیمات مرورگر آن را فعال کنید.', 'error');
                    if (!currentUser.location) currentUser.location = { lat: 35.6892, lng: 51.3890 };
                    onLocationReady(currentUser.location.lat, currentUser.location.lng);
                }
            });
        }
function createDriverMap(lat, lng) {
            driverMainMap = L.map('driver-main-map').setView([lat, lng], 15);
            driverMainMap.userMarkers = {};

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(driverMainMap);
            
            const gpsIndicator = document.createElement('div');
            gpsIndicator.className = 'gps-status-indicator';
            gpsIndicator.innerHTML = '<i class="fas fa-satellite-dish"></i> GPS فعال';
            document.getElementById('driver-main-map').appendChild(gpsIndicator);
            
            const activeRequest = requests.find(r => 
                r.driverId === currentUser.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status)
            );
            
            const userMarker = L.marker([lat, lng], {
                icon: getMarkerIcon('driver', currentUser, activeRequest)
            })
            .addTo(driverMainMap)
            .bindPopup(getMarkerPopupContent(currentUser, !!activeRequest, true))
            .openPopup();
            driverMainMap.userMarkers[currentUser.id] = userMarker;

            addOtherUsersToMap(driverMainMap);
        }

        function initializeFarmerMap() {
            setTimeout(() => {
                if (!farmerMap) {
                    farmerMap = L.map('farmer-map').setView([currentUser.location.lat, currentUser.location.lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(farmerMap);
                    farmerMap.userMarkers = {};

                    const userMarker = L.marker([currentUser.location.lat, currentUser.location.lng], {
                        icon: getMarkerIcon('farmer', currentUser, false)
                    })
                    .addTo(farmerMap)
                    .bindPopup(getMarkerPopupContent(currentUser, false, true))
                    .openPopup();
                    farmerMap.userMarkers[currentUser.id] = userMarker;
                    
                    addOtherUsersToMap(farmerMap);
                } else {
                    farmerMap.invalidateSize();
                }
            }, 100);
        }

        function initializeBuyerMap() {
            setTimeout(() => {
                if (!buyerMap) {
                    buyerMap = L.map('buyer-map').setView([currentUser.location.lat, currentUser.location.lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(buyerMap);
                    buyerMap.userMarkers = {};

                    const userMarker = L.marker([currentUser.location.lat, currentUser.location.lng], {
                        icon: getMarkerIcon('buyer', currentUser, false)
                    })
                    .addTo(buyerMap)
                    .bindPopup(getMarkerPopupContent(currentUser, false, true))
                    .openPopup();
                    buyerMap.userMarkers[currentUser.id] = userMarker;
                    
                    addOtherUsersToMap(buyerMap);
                } else {
                    buyerMap.invalidateSize();
                }
            }, 100);
        }
        
        async function updateDriverLocationInStorage() {
            // This function is called frequently by GPS updates.
            // It should be a lightweight call to the server.
            await api.updateUser(currentUser.id, { location: currentUser.location });
            // No need for feedback here, it's a background task.
        }
        
        function addOtherUsersToMap(map) {
            if (!map.userMarkers) map.userMarkers = {};
            
            // Clear previous markers for other users to avoid duplicates
            Object.keys(map.userMarkers).forEach(userId => {
                if (currentUser && parseInt(userId) !== currentUser.id) {
                    map.removeLayer(map.userMarkers[userId]);
                    delete map.userMarkers[userId];
                }
            });

            users.forEach(user => {
                if (currentUser && user.id !== currentUser.id && user.location && shouldShowUser(user)) {
                    const activeRequest = user.role === 'driver'
                        ? requests.find(r => r.driverId === user.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status))
                        : null;

                    const icon = getMarkerIcon(user.role, user, activeRequest);
                    const marker = L.marker([user.location.lat, user.location.lng], { icon })
                        .addTo(map)
                        .bindPopup(getMarkerPopupContent(user, !!activeRequest, false));
                    map.userMarkers[user.id] = marker;
                }
            });
        }
function refreshAllMapMarkers() {
            const currentMap = getCurrentMap();
            if (!currentMap || !currentMap.userMarkers) return;
            
            users.forEach(user => {
                if (currentUser && user.id === currentUser.id) return; // Skip self

                const shouldBeVisible = user.location && shouldShowUser(user);
                const markerExists = currentMap.userMarkers[user.id];

                if (shouldBeVisible) {
                    const activeRequest = user.role === 'driver'
                        ? requests.find(r => r.driverId === user.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status))
                        : null;
                    
                    if (markerExists) {
                        // Update existing marker
                        const marker = currentMap.userMarkers[user.id];
                        marker.setLatLng([user.location.lat, user.location.lng]);
                        const newIcon = getMarkerIcon(user.role, user, activeRequest);
                        if (marker.getIcon().options.html !== newIcon.options.html) {
                           marker.setIcon(newIcon);
                        }
                        marker.setPopupContent(getMarkerPopupContent(user, !!activeRequest, false));
                    } else {
                        // Add new marker
                        const icon = getMarkerIcon(user.role, user, activeRequest);
                        const newMarker = L.marker([user.location.lat, user.location.lng], { icon })
                            .addTo(currentMap)
                            .bindPopup(getMarkerPopupContent(user, !!activeRequest, false));
                        currentMap.userMarkers[user.id] = newMarker;
                    }
                } else {
                    if (markerExists) {
                        // Remove marker
                        currentMap.removeLayer(currentMap.userMarkers[user.id]);
                        delete currentMap.userMarkers[user.id];
                    }
                }
            });
        }

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        async function submitAdFromPanel(event, role) {
            event.preventDefault();
            
            const adType = document.getElementById(`${role}-panel-ad-type`).value;
            const product = document.getElementById(`${role}-panel-ad-product`).value;
            const category = document.getElementById(`${role}-panel-ad-category`).value;
            const quantity = document.getElementById(`${role}-panel-ad-quantity`).value;
            const price = document.getElementById(`${role}-panel-ad-price`).value;
            const imageInput = document.getElementById(`${role}-panel-ad-image`);
            const imageFile = imageInput.files[0];
            let imageDataUrl = null;

            if (imageFile) {
                if (imageFile.size > 2 * 1024 * 1024) { // 2MB size limit
                    showToast('حجم عکس باید کمتر از ۲ مگابایت باشد', 'error');
                    return;
                }
                try {
                    imageDataUrl = await toBase64(imageFile);
                } catch (error) {
                    console.error('Error converting image to Base64:', error);
                    showToast('خطا در پردازش تصویر', 'error');
                    return;
                }
            }

            if (!product || !quantity || !price) {
                showToast('❌ لطفاً تمام فیلدهای لازم را پر کنید', 'error');
                return;
            }

            const categoryEmojis = { 'vegetables': '🥬', 'fruits': '🍎', 'grains': '🌾', 'nuts': '🥜' };
            
            const adData = {
                product,
                category,
                quantity: parseInt(quantity),
                price: parseInt(price),
                emoji: categoryEmojis[category],
                date: new Date().toLocaleDateString('fa-IR'),
                createdAt: new Date().toISOString(),
                image: imageDataUrl,
                adType: adType
            };

            if (adType === 'supply') {
                adData.seller = currentUser.fullname;
                adData.sellerId = currentUser.id;
            } else { // demand
                adData.buyer = currentUser.fullname;
                adData.buyerId = currentUser.id;
            }
            
            const response = await api.createAd(adData);

            if (response.success) {
                showToast(`✅ آگهی ${adType === 'supply' ? 'عرضه' : 'تقاضای'} شما با موفقیت در بازار ثبت شد`, 'success');
                event.target.reset();
                await loadDataFromServer();
                // Re-render the marketplace with the new ad
                applyMarketFilters(true);
            } else {
                showToast(response.message || 'خطا در ثبت آگهی.', 'error');
            }
        }


        function showLightbox(src) {
            document.getElementById('lightbox-image').src = src;
            const modal = document.getElementById('lightbox-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeLightbox() {
            const modal = document.getElementById('lightbox-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        let activeChats = {};

        function openChatWindowByName(userName, adId) {
            const user = users.find(u => u.fullname === userName);
            if (user) {
                openChatWindow(user.id, adId);
            } else {
                showToast('کاربر مورد نظر یافت نشد', 'error');
            }
        }

        async function openChatWindow(recipientId, adId) {
            // Mark the conversation as read via the API
            const response = await api.markConversationAsRead(recipientId, currentUser.id);

            if (response.success) {
                // The API has updated the "server" (localStorage). Now, refresh the client state.
                await loadDataFromServer();
                
                // Re-render the UI elements that depend on message read status.
                if(currentUser) {
                    loadMessages(currentUser.role);
                    updateAllNotifications();
                }
            }

            const conversationId = [currentUser.id, recipientId].sort().join('-');
            
            if (activeChats[conversationId]) {
                const chatWindow = document.getElementById(`chat-window-${conversationId}`);
                if (chatWindow.classList.contains('minimized')) {
                    chatWindow.classList.remove('minimized');
                    chatWindow.querySelector('.chat-header').classList.remove('minimized-header');
                }
                chatWindow.style.display = 'flex';
                return;
            }

            const recipient = users.find(u => u.id === recipientId);
            if (!recipient) {
                showToast('گیرنده یافت نشد', 'error');
                return;
            }

            const chatWindow = document.createElement('div');
            chatWindow.id = `chat-window-${conversationId}`;
            chatWindow.className = 'chat-window';
            
            chatWindow.innerHTML = `
                <div class="chat-header" onclick="toggleMinimizeChat('${conversationId}')">
                    <span>${recipient.fullname}</span>
                    <div>
                        <button class="chat-header-button" onclick="event.stopPropagation(); toggleMinimizeChat('${conversationId}')">－</button>
                        <button class="chat-header-button" onclick="event.stopPropagation(); closeChatWindow('${conversationId}')">×</button>
                    </div>
                </div>
                <div class="chat-messages" id="chat-messages-${conversationId}"></div>
                <form class="chat-input-form" onsubmit="sendChatMessage(event, '${conversationId}', ${recipientId}, ${adId})">
                    <label class="chat-action-btn">
                        <i class="fas fa-paperclip"></i>
                        <input type="file" class="hidden" accept="image/*" onchange="sendChatImage(event, '${conversationId}', ${recipientId}, ${adId})">
                    </label>
                    <textarea class="chat-input" id="chat-input-${conversationId}" placeholder="پیام خود را بنویسید..." rows="1" onkeydown="if(event.key === 'Enter' && !event.shiftKey) { sendChatMessage(event, '${conversationId}', ${recipientId}, ${adId}); }"></textarea>
                    <button type="submit" class="chat-action-btn"><i class="fas fa-paper-plane"></i></button>
                </form>
            `;

            document.getElementById('chat-manager-container').appendChild(chatWindow);
            activeChats[conversationId] = { recipientId, adId, minimized: false };
            loadChatMessages(conversationId, recipientId);
        }

        function loadChatMessages(conversationId, recipientId) {
            const messagesContainer = document.getElementById(`chat-messages-${conversationId}`);
            if (!messagesContainer) return;
            const conversationMessages = messages.filter(m => 
                ((m.senderId === currentUser.id && m.recipientId === recipientId) ||
                (m.senderId === recipientId && m.recipientId === currentUser.id))
            );

            messagesContainer.innerHTML = conversationMessages.map(msg => {
                const isSent = msg.senderId === currentUser.id;
                return `
                    <div class="chat-bubble ${isSent ? 'sent' : 'received'}">
                        ${msg.content ? `<div>${DOMPurify.sanitize(msg.content)}</div>` : ''}
                        ${msg.image ? `<img src="${msg.image}" alt="تصویر پیوست" class="mt-2 rounded-lg cursor-pointer" onclick="showLightbox('${msg.image}')">` : ''}
                    </div>
                `;
            }).join('');
        }

        async function sendChatMessage(event, conversationId, recipientId, adId) {
            event.preventDefault();
            const input = document.getElementById(`chat-input-${conversationId}`);
            if (!input || !input.value.trim()) return;
            
            const messageText = input.value.trim();
            await createAndSendMessage(conversationId, recipientId, adId, messageText, null);
            input.value = '';
        }

        async function sendChatImage(event, conversationId, recipientId, adId) {
            const imageFile = event.target.files[0];
            if (!imageFile) return;

            if (imageFile.size > 2 * 1024 * 1024) { // 2MB size limit
                showToast('حجم عکس باید کمتر از ۲ مگابایت باشد', 'error');
                return;
            }
            try {
                const imageDataUrl = await toBase64(imageFile);
                await createAndSendMessage(conversationId, recipientId, adId, '', imageDataUrl);
            } catch (error) {
                showToast('خطا در پردازش تصویر', 'error');
            }
            event.target.value = ''; // Reset file input
        }

        function appendMessageToChatWindow(message, conversationId) {
            const messagesContainer = document.getElementById(`chat-messages-${conversationId}`);
            if (!messagesContainer) return;

            const isSent = message.senderId === currentUser.id;
            const bubble = document.createElement('div');
            bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
            bubble.innerHTML = `
                ${message.content ? `<div>${DOMPurify.sanitize(message.content)}</div>` : ''}
                ${message.image ? `<img src="${message.image}" alt="تصویر پیوست" class="mt-2 rounded-lg cursor-pointer" onclick="showLightbox('${msg.image}')">` : ''}
            `;
            
            messagesContainer.insertBefore(bubble, messagesContainer.firstChild);
        }

        async function createAndSendMessage(conversationId, recipientId, adId, content, imageUrl) {
            const recipient = users.find(u => u.id === recipientId);
            const messageData = {
                adId,
                senderId: currentUser.id,
                senderName: currentUser.fullname,
                recipientId,
                recipientName: recipient.fullname,
                content: content,
                image: imageUrl,
                createdAt: new Date().toISOString()
            };

            const response = await api.createMessage(messageData);

            if (response.success) {
                // The API returns the created message with its new ID.
                const newMessage = response.message;
                
                // Append the new message to the chat window immediately for a fluid UX.
                // The next periodic refresh will officially sync the `messages` array, but this is faster.
                appendMessageToChatWindow(newMessage, conversationId);
            } else {
                showToast(response.message || 'خطا در ارسال پیام.', 'error');
            }
        }
        
        function closeChatWindow(conversationId) {
            const chatWindow = document.getElementById(`chat-window-${conversationId}`);
            if (chatWindow) {
                chatWindow.remove();
            }
            delete activeChats[conversationId];
        }

        function toggleMinimizeChat(conversationId) {
            const chatWindow = document.getElementById(`chat-window-${conversationId}`);
            const header = chatWindow.querySelector('.chat-header');
            if (chatWindow.classList.contains('minimized')) {
                // Restore
                chatWindow.classList.remove('minimized');
                header.classList.remove('minimized-header');
            } else {
                // Minimize
                chatWindow.classList.add('minimized');
                header.classList.add('minimized-header');
            }
            activeChats[conversationId].minimized = chatWindow.classList.contains('minimized');
        }

        // Global array to track items seen during the current session
        let seenItemIds = [];

        function updateBadge(badgeId, count) {
            const badge = document.getElementById(badgeId);
            if (!badge) return;

            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        function updateAllNotifications() {
            if (!currentUser) return;

            let totalUnreadCount = 0; // For accordion and nav badges (respects 'seen')
            let bellNotificationCount = 0; // For header bell (ignores 'seen')
            const role = currentUser.role;

            // 1. Unread Messages
            const unreadMessages = messages.filter(m => m.recipientId === currentUser.id && !m.read);
            const unreadMessageCount = unreadMessages.length;
            updateBadge(`${role}-messages-badge`, unreadMessageCount);
            totalUnreadCount += unreadMessageCount;
            bellNotificationCount += unreadMessageCount; // Messages are the same for both

            // 2. Role-specific notifications
            if (role === 'sorting') {
                // Pending transport requests
                const pendingRequests = requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'pending');
                bellNotificationCount += pendingRequests.length;
                const unseenPendingRequests = pendingRequests.filter(r => !seenItemIds.includes(r.id));
                updateBadge('sorting-pending-requests-badge', unseenPendingRequests.length);
                totalUnreadCount += unseenPendingRequests.length;

                // Pending connection requests
                const pendingConnections = connections.filter(c => c.targetId === currentUser.id && c.status === 'pending');
                bellNotificationCount += pendingConnections.length;
                const unseenPendingConnections = pendingConnections.filter(c => !seenItemIds.includes(c.id));
                updateBadge('sorting-connection-requests-badge', unseenPendingConnections.length);
                totalUnreadCount += unseenPendingConnections.length;

                // Incoming deliveries
                const incomingDeliveries = requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'in_progress_to_sorting');
                bellNotificationCount += incomingDeliveries.length;
                const unseenIncomingDeliveries = incomingDeliveries.filter(r => !seenItemIds.includes(r.id));
                updateBadge('sorting-incoming-deliveries-badge', unseenIncomingDeliveries.length);
                totalUnreadCount += unseenIncomingDeliveries.length;

            } else if (role === 'driver') {
                // Pending assignments
                const pendingAssignments = requests.filter(r => r.driverId === currentUser.id && r.status === 'assigned');
                bellNotificationCount += pendingAssignments.length;
                const unseenPendingAssignments = pendingAssignments.filter(r => !seenItemIds.includes(r.id));
                updateBadge('driver-pending-requests-badge', unseenPendingAssignments.length);
                totalUnreadCount += unseenPendingAssignments.length;
            }

            // 3. Update the main navigation badge and the header bell
            updateBadge('nav-receive-badge', totalUnreadCount);
            updateBadge('notification-badge', bellNotificationCount);
        }

        function loadMessages(role) {
            const messagesContainer = document.getElementById(`${role}-messages`);
            
            // Unread message count is now handled by updateAllNotifications()
            const conversations = messages.reduce((acc, msg) => {
                if (msg.senderId !== currentUser.id && msg.recipientId !== currentUser.id) return acc;

                const otherPartyId = msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
                const key = `${msg.adId}-${otherPartyId}`; // Group by ad and other person
                if (!acc[key]) {
                    acc[key] = {
                        adId: msg.adId,
                        otherPartyId: otherPartyId,
                        otherPartyName: msg.senderId === currentUser.id ? msg.recipientName : msg.senderName,
                        lastMessage: msg,
                        unreadInConvo: 0
                    };
                }
                // Update last message
                if (new Date(msg.createdAt) > new Date(acc[key].lastMessage.createdAt)) {
                    acc[key].lastMessage = msg;
                }
                // Count unread in this specific conversation
                if (msg.recipientId === currentUser.id && !msg.read) {
                    acc[key].unreadInConvo++;
                }
                return acc;
            }, {});
        
            const sortedConversations = Object.values(conversations).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
        
            if (sortedConversations.length === 0) {
                messagesContainer.innerHTML = '<p class="text-gray-500 text-center py-8">پیامی وجود ندارد</p>';
                return;
            }
        
            messagesContainer.innerHTML = sortedConversations.map(convo => `
                <div class="border rounded-lg p-4 ${convo.unreadInConvo > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}">
                    <div class="flex items-center justify-between mb-2">
                        <h5 class="font-semibold text-gray-800">${convo.otherPartyName}</h5>
                        <span class="text-xs text-gray-500">${formatDate(convo.lastMessage.createdAt)}</span>
                    </div>
                    <p class="text-gray-700 truncate">
                        ${convo.unreadInConvo > 0 ? `<span class="inline-block w-2 h-2 bg-blue-500 rounded-full ml-2"></span>` : ''}
                        ${convo.lastMessage.content ? convo.lastMessage.content : 'تصویر'}
                    </p>
                    <div class="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between">
                        <div class="flex items-center space-x-2 space-x-reverse">
                             <button onclick="openChatWindow(${convo.otherPartyId}, ${convo.adId})" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors">
                                <i class="fas fa-comments ml-1"></i>
                                مشاهده گفتگو
                            </button>
                            <button onclick="deleteConversation(${convo.adId}, ${convo.otherPartyId}, '${role}')" class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full transition-colors">
                                <i class="fas fa-trash ml-1"></i>
                                حذف
                            </button>
                        </div>
                        ${convo.unreadInConvo > 0 ? `<span class="text-xs font-bold text-blue-600">${convo.unreadInConvo} پیام جدید</span>` : ''}
                    </div>
                </div>
            `).join('');
        }

        async function deleteConversation(adId, otherPartyId, role) {
            if (confirm('آیا از حذف این گفتگو مطمئن هستید؟ تمام پیام ها پاک خواهد شد.')) {
                const response = await api.deleteConversation(adId, otherPartyId, currentUser.id);

                if (response.success) {
                    const conversationId = [currentUser.id, otherPartyId].sort().join('-');
                    if (activeChats[conversationId]) {
                        closeChatWindow(conversationId);
                    }
                    
                    await loadDataFromServer();
                    loadMessages(role);
                    showToast('گفتگو با موفقیت حذف شد', 'success');
                } else {
                    showToast(response.message || 'خطا در حذف گفتگو.', 'error');
                }
            }
        }


        function shouldShowUser(user) {
            // New privacy rules based on connections
            if (!currentUser) return false;

            // Buyers can see all producers and sorters
            if (currentUser.role === 'buyer') {
                return ['greenhouse', 'farmer', 'sorting'].includes(user.role);
            }

            // Greenhouses can see sorting centers they are connected to (approved only)
            // and drivers assigned to their active missions.
            if (currentUser.role === 'greenhouse') {
                if (user.role === 'sorting') {
                    return connections.some(c => c.sourceId === currentUser.id && c.targetId === user.id && c.status === 'approved');
                }
                if (user.role === 'driver') {
                    return requests.some(r => r.greenhouseId === currentUser.id && r.driverId === user.id && r.status !== 'completed');
                }
            }

            // Drivers can see sorting centers they are connected to (approved only)
            // and the greenhouse of their active mission.
            if (currentUser.role === 'driver') {
                if (user.role === 'sorting') {
                    return connections.some(c => c.sourceId === currentUser.id && c.targetId === user.id && c.status === 'approved');
                }
                if (user.role === 'greenhouse' || user.role === 'farmer') {
                     return requests.some(r => r.driverId === currentUser.id && (r.greenhouseId === user.id || r.farmerId === user.id) && r.status !== 'completed');
                }
            }

            // Sorting centers can see all greenhouses and drivers they are connected with (approved status).
            if (currentUser.role === 'sorting') {
                if (user.role === 'greenhouse' || user.role === 'driver') {
                    return connections.some(c => c.targetId === currentUser.id && c.sourceId === user.id && c.status === 'approved');
                }
            }
            
            // Farmers are not part of the connection system in this iteration
            if (currentUser.role === 'farmer') {
                // Can see drivers assigned to their requests
                 if (user.role === 'driver') {
                    return requests.some(r => r.farmerId === currentUser.id && r.driverId === user.id && r.status !== 'completed');
                }
            }

            return false;
        }

        function getMarkerIcon(role, user = null, activeRequest = null) {
            const isActive = !!activeRequest;
            const isSortingDelivery = isActive && activeRequest.type === 'sorting_delivery';

            const icons = {
                greenhouse: '🏡',
                sorting: '🏭',
                driver: isActive ? '🚛' : '🚚',
                farmer: '🧑‍🌾',
                buyer: '🛒'
            };

            let driverColor;
            if (!isActive) {
                driverColor = '#f59e0b'; // Inactive is orange/yellow
            } else if (isSortingDelivery) {
                driverColor = '#10b981'; // Green for sorting delivery
            } else {
                driverColor = '#ef4444'; // Red for general missions
            }

            const colors = {
                greenhouse: '#10b981',
                sorting: '#3b82f6',
                driver: driverColor,
                farmer: '#f59e0b',
                buyer: '#8b5cf6'
            };

            const userName = user ? user.fullname : '';
            const statusText = role === 'driver' ? (isActive ? 'در ماموریت' : 'آزاد') : '';
            
            return L.divIcon({
                className: 'custom-location-marker',
                html: `
                    <div style="text-align: center;">
                        <div style="
                            background: ${colors[role]}; 
                            width: 40px; 
                            height: 40px; 
                            border-radius: 50%; 
                            border: 3px solid white; 
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            margin: 0 auto;
                            ${isActive ? 'animation: pulse 2s infinite;' : ''}
                        ">
                            ${icons[role]}
                        </div>
                        ${userName ? `
                            <div style="
                                background: white;
                                padding: 2px 6px;
                                border-radius: 12px;
                                font-size: 10px;
                                font-weight: bold;
                                color: ${colors[role]};
                                border: 1px solid ${colors[role]};
                                margin-top: 2px;
                                white-space: nowrap;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            ">
                                ${userName}
                                ${statusText ? `<br><span style="font-size: 8px;">${statusText}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `,
                iconSize: [60, userName ? 70 : 50],
                iconAnchor: [30, userName ? 65 : 45]
            });
        }

        // Main App Functions
        async function showMainApp() {
            // Defensive check to prevent errors if currentUser is null or lacks a role
            if (!currentUser || !currentUser.role) {
                console.error("showMainApp called with an invalid user object. Aborting.", currentUser);
                updateUiState(UI_STATES.LANDING); // Redirect to landing page
                return;
            }

            updateUiState(UI_STATES.MAIN_APP);
            
            if (!sessionStorage.getItem('disclaimer_shown_this_session')) {
                showDisclaimerModal();
            }

            subscribeToPushNotifications(); // Ask for push notification permission
            
            // This logic runs after the UI state is updated
            await loadDataFromServer();

            // It's possible that loadDataFromServer failed and triggered a logout.
            // We need to check if the user is still logged in before proceeding.
            if (!currentUser) {
                console.log("User was logged out during data fetch. Aborting showMainApp.");
                return; 
            }
            
            // Update header with dynamic role icon
            const headerTitle = document.getElementById('main-header-title');
            const roleIcon = getRoleIcon(currentUser.role);
            const iconSpan = document.createElement('span');
            iconSpan.className = 'spin-animation';
            iconSpan.textContent = roleIcon;
            
            // Prepend the icon to the h1 title
            if (!headerTitle.querySelector('.spin-animation')) { // Prevent adding duplicate icons
                headerTitle.prepend(iconSpan);
            }

            // Update user info text
            document.getElementById('user-info').textContent = `${currentUser.fullname} - ${getRoleTitle(currentUser.role)}`;
            

            // Show appropriate panel
            showPanel(currentUser.role);
            
            // Load data
            loadPanelData();
            updateAllNotifications();
            
            // Initialize maps
            initializePanelMaps();
            
            // Setup role-specific event listeners
            if (currentUser.role === 'driver') {
                setupDriverCapacityRules();
            }

            // Create the initial data snapshot for notification checking.
            updateDataSnapshot();
            
            // Check for application updates
            checkForAppUpdates();
        }

        function getRoleTitle(role) {
            const titles = {
                greenhouse: 'گلخانه‌دار',
                sorting: 'مرکز سورتینگ',
                driver: 'راننده',
                farmer: 'کشاورز',
                buyer: 'خریدار'
            };
            return titles[role] || role;
        }

        function showPanel(role) {
            document.querySelectorAll('.panel').forEach(panel => {
                panel.classList.add('hidden');
            });
            const panelId = `${role}-panel`;
            const panelElement = document.getElementById(panelId);
            if (panelElement) {
                panelElement.classList.remove('hidden');
            } else {
                console.error(`Panel with ID ${panelId} not found.`);
            }

            // Show bottom nav for roles that use it
            const bottomNav = document.getElementById('bottom-nav');
            const mainApp = document.getElementById('main-app');
            if (['greenhouse', 'sorting', 'driver', 'farmer', 'buyer'].includes(role)) { // Add other roles as they are implemented
                bottomNav.classList.remove('hidden');
                mainApp.style.paddingBottom = '80px';
            } else {
                bottomNav.classList.add('hidden');
                mainApp.style.paddingBottom = '0';
            }
        }

        function loadPanelData() {
            if (currentUser.role === 'greenhouse') {
                loadSortingCenters();
                loadGreenhouseRequests();
                filterGreenhouseReports();
                loadMessages('greenhouse');
                loadGreenhouseConnections();
                renderMarketplace('greenhouse-marketplace-container', 'light');
            } else if (currentUser.role === 'sorting') {
                loadSortingRequests();
                loadAvailableDrivers();
                filterSortingReports();
                loadMessages('sorting');
                loadSortingConnectionRequests();
                loadSortingApprovedConnections();
                loadIncomingDeliveries();
                renderMarketplace('sorting-marketplace-container', 'light');
            } else if (currentUser.role === 'driver') {
                loadDriverStatus();
                loadDriverRequests();
                loadDriverActiveMission();
                filterDriverReports();
                loadMessages('driver');
                loadDriverConnections();
                renderMarketplace('driver-marketplace-container', 'light');
            } else if (currentUser.role === 'farmer') {
                loadFarmerData();
                filterFarmerReports();
                loadMessages('farmer');
                renderMarketplace('farmer-marketplace-container', 'light');
            } else if (currentUser.role === 'buyer') {
                loadBuyerData();
                filterBuyerReports();
                loadMessages('buyer');
                renderMarketplace('buyer-marketplace-container', 'light');
            }
        }

        // Connection Functions
        async function requestConnection(targetId, sourceRole) {
            await loadDataFromServer(); // Get latest data
            const existingConnection = connections.find(c =>
                c.sourceId === currentUser.id && c.targetId === parseInt(targetId)
            );

            if (existingConnection) {
                showToast('درخواست اتصال قبلاً ارسال شده است', 'info');
                return;
            }

            const connectionData = {
                sourceId: currentUser.id,
                sourceName: currentUser.fullname,
                sourceRole: sourceRole,
                sourcePhone: currentUser.phone,
                targetId: parseInt(targetId),
                createdAt: new Date().toISOString()
            };

            if (sourceRole === 'driver') {
                connectionData.sourceLicensePlate = currentUser.licensePlate;
            } else if (sourceRole === 'greenhouse') {
                connectionData.sourceAddress = currentUser.address;
            }

            const response = await api.createConnection(connectionData);

            if (response.success) {
                // The server should create the notification for the target user.
                showToast('درخواست اتصال ارسال شد', 'success');
                // Refresh relevant UI parts
                if (currentUser.role === 'greenhouse') loadGreenhouseConnections();
                if (currentUser.role === 'driver') loadDriverConnections();
            } else {
                showToast(response.message || 'خطا در ارسال درخواست اتصال.', 'error');
            }
        }

        async function approveConnection(connectionId) {
            const response = await api.updateConnection(connectionId, { status: 'approved' });
            if (response.success) {
                // The server should create the notification for the source user.
                showToast('اتصال تایید شد', 'success');
                await loadDataFromServer(); // Reload data to reflect changes
                loadSortingConnectionRequests();
                loadSortingApprovedConnections();
            } else {
                showToast(response.message || 'خطا در تایید اتصال.', 'error');
            }
        }

        async function rejectConnection(connectionId) {
            // We need the connection details before deleting it to send a notification.
            await loadDataFromServer();
            
            const response = await api.deleteConnection(connectionId);
            if (response.success) {
                // The server should handle notifying the user (if desired).
                showToast('درخواست اتصال رد شد', 'info');
                await loadDataFromServer(); // Reload data to reflect changes
                loadSortingConnectionRequests();
            } else {
                showToast(response.message || 'خطا در رد کردن اتصال.', 'error');
            }
        }

        function loadSortingConnectionRequests() {
            const container = document.getElementById('sorting-connection-requests');
            if (!container) return;
            const pending = connections.filter(c => c.targetId === currentUser.id && c.status === 'pending');

            if (pending.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">درخواست اتصال جدیدی وجود ندارد</p>';
                return;
            }

            container.innerHTML = pending.map(req => {
                let detailsHtml = `<p class="text-sm text-gray-600">تلفن: ${req.sourcePhone || '-'}</p>`;
                if (req.sourceRole === 'driver') {
                    detailsHtml += `<p class="text-sm text-gray-600">پلاک: ${req.sourceLicensePlate || '-'}</p>`;
                } else if (req.sourceRole === 'greenhouse') {
                    detailsHtml += `<p class="text-sm text-gray-600">آدرس: ${req.sourceAddress || '-'}</p>`;
                }

                return `
                <div class="border rounded-lg p-4">
                    <div class="flex justify-between items-center mb-3">
                        <div>
                           <h4 class="font-semibold">${req.sourceName}</h4>
                           <p class="text-sm text-gray-600">نقش: ${getRoleTitle(req.sourceRole)}</p>
                           ${detailsHtml}
                        </div>
                        <span class="text-xs text-gray-500">${formatDate(req.createdAt)}</span>
                    </div>
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="approveConnection(${req.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">تایید</button>
                        <button onclick="rejectConnection(${req.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">رد</button>
                    </div>
                </div>
            `}).join('');
        }

        function loadSortingApprovedConnections() {
            const container = document.getElementById('sorting-approved-connections');
            if (!container) return;

            const allApproved = connections.filter(c => c.targetId === currentUser.id && c.status === 'approved');
            
            const approvedDrivers = allApproved.filter(c => c.sourceRole === 'driver');
            const approvedGreenhouses = allApproved.filter(c => c.sourceRole === 'greenhouse');

            if (allApproved.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ اتصال تایید شده‌ای وجود ندارد</p>';
                return;
            }

            let html = '';

            // Render Drivers
            html += '<h4 class="text-lg font-semibold mb-2 text-gray-700">🚛 رانندگان</h4>';
            if (approvedDrivers.length > 0) {
                html += '<div class="space-y-3">';
                html += approvedDrivers.map(conn => {
                    const driver = users.find(u => u.id === conn.sourceId);
                    const isSuspended = conn.suspended === true;
                    const suspendButtonClass = isSuspended ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600';
                    const suspendButtonText = isSuspended ? 'فعال سازی' : 'معلق کردن';
                    return `
                        <div class="border rounded-lg p-3 flex justify-between items-center ${isSuspended ? 'bg-yellow-50' : 'bg-blue-50'}">
                            <div>
                                <h5 class="font-semibold">${conn.sourceName}</h5>
                                <p class="text-xs text-gray-500">${driver ? driver.licensePlate : ''}</p>
                                ${isSuspended ? '<p class="text-xs font-bold text-yellow-700">(معلق)</p>' : ''}
                            </div>
                            <div class="flex items-center space-x-2 space-x-reverse">
                                <button onclick="toggleConnectionSuspension(${conn.id})" class="${suspendButtonClass} text-white px-2 py-1 rounded-lg text-xs">${suspendButtonText}</button>
                                <button onclick="disconnectFromCenter(${conn.id})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs">قطع</button>
                            </div>
                        </div>
                    `;
                }).join('');
                html += '</div>';
            } else {
                html += '<p class="text-sm text-gray-500 mb-4">راننده‌ای متصل نیست.</p>';
            }

            // Render Greenhouses
            html += '<h4 class="text-lg font-semibold mt-6 mb-2 text-gray-700">🏡 گلخانه‌ها</h4>';
            if (approvedGreenhouses.length > 0) {
                html += '<div class="space-y-3">';
                html += approvedGreenhouses.map(conn => `
                    <div class="border rounded-lg p-3 flex justify-between items-center bg-green-50">
                        <div>
                            <h5 class="font-semibold">${conn.sourceName}</h5>
                        </div>
                        <button onclick="disconnectFromCenter(${conn.id})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs">قطع اتصال</button>
                    </div>
                `).join('');
                html += '</div>';
            } else {
                html += '<p class="text-sm text-gray-500">گلخانه‌ای متصل نیست.</p>';
            }

            container.innerHTML = html;
        }

        async function toggleConnectionSuspension(connectionId) {
            // Find the current state to toggle it
            await loadDataFromServer();
            const connection = connections.find(c => c.id === connectionId);
            if (!connection) {
                showToast('اتصال یافت نشد.', 'error');
                return;
            }
            const newSuspendedState = !connection.suspended;

            const response = await api.updateConnection(connectionId, { suspended: newSuspendedState });

            if (response.success) {
                showToast(`اتصال راننده با موفقیت ${newSuspendedState ? 'معلق' : 'فعال'} شد.`, 'success');
                await loadDataFromServer(); // Reload data
                // Refresh the UI
                loadSortingApprovedConnections();
                loadAvailableDrivers();
            } else {
                showToast(response.message || 'خطا در تغییر وضعیت اتصال.', 'error');
            }
        }

        function loadIncomingDeliveries() {
            const container = document.getElementById('sorting-incoming-deliveries');
            if (!container) return;

            const incomingDeliveries = requests.filter(r => 
                r.sortingCenterId === currentUser.id && r.type === 'delivered_basket' && r.status === 'in_progress_to_sorting'
            );

            if (incomingDeliveries.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">هیچ تحویل ورودی در حال حاضر وجود ندارد.</p>';
                return;
            }

            container.innerHTML = incomingDeliveries.map(delivery => `
                <div class="border rounded-lg p-4 bg-indigo-50">
                    <div class="flex justify-between items-center mb-3">
                        <div>
                           <h4 class="font-semibold">${delivery.driverName} (${getUser(delivery.driverId)?.licensePlate || '-'})</h4>
                           <p class="text-sm text-gray-600">در حال آوردن: ${delivery.greenhouseName}</p>
                        </div>
                        <span class="text-xs text-gray-500">${formatDate(delivery.createdAt)}</span>
                    </div>
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="confirmSortingDelivery(${delivery.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">تأیید رسید</button>
                        <button onclick="cancelSortingDelivery(${delivery.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">عدم تایید</button>
                    </div>
                </div>
            `).join('');
        }

        async function requestDriverConnection() {
            const select = document.getElementById('driver-sorting-center-select');
            const targetId = select.value;
            if (!targetId) {
                showToast('لطفاً یک مرکز سورتینگ را انتخاب کنید', 'error');
                return;
            }
            await requestConnection(targetId, 'driver');
        }

        function loadDriverConnections() {
            const select = document.getElementById('driver-sorting-center-select');
            const currentConnectionsContainer = document.getElementById('driver-current-connections');
            if (!select || !currentConnectionsContainer) return;

            // Get all connections for the current driver
            const myConnections = connections.filter(c => c.sourceId === currentUser.id && c.sourceRole === 'driver');
            
            // --- Part 1: Update the dropdown list with *available* centers ---
            const allSortingCenters = users.filter(u => u.role === 'sorting');
            const connectedCenterIds = myConnections.map(c => c.targetId);
            const availableCenters = allSortingCenters.filter(center => !connectedCenterIds.includes(center.id));
            
            const currentSelection = select.value; // Save current selection

            // Clear existing options but keep the placeholder
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add new, available centers
            availableCenters.forEach(center => {
                const option = document.createElement('option');
                option.value = center.id;
                option.textContent = center.fullname;
                select.appendChild(option);
            });
            
            // Restore selection if it's still a valid option
            if (Array.from(select.options).some(opt => opt.value === currentSelection)) {
                select.value = currentSelection;
            }

            // --- Part 2: Update the list of *current* connections ---
            if (myConnections.length === 0) {
                currentConnectionsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هنوز اتصالی برقرار نشده است.</p>';
            } else {
                currentConnectionsContainer.innerHTML = myConnections.map(conn => {
                    const center = users.find(u => u.id === conn.targetId);
                    let statusText, statusClass;
                    switch(conn.status) {
                        case 'pending': statusText = 'در انتظار تایید'; statusClass = 'bg-yellow-100 text-yellow-800'; break;
                        case 'approved': statusText = 'تایید شده'; statusClass = 'bg-green-100 text-green-800'; break;
                        default: statusText = 'نامشخص'; statusClass = 'bg-gray-100 text-gray-800';
                    }
                    return `
                        <div class="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                            <div>
                                <h4 class="font-semibold">${center ? center.fullname : 'مرکز حذف شده'}</h4>
                                <p class="text-sm font-medium px-2 py-1 rounded-full inline-block ${statusClass}">${statusText}</p>
                            </div>
                            <button onclick="disconnectFromCenter(${conn.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
                                لغو اتصال
                            </button>
                        </div>
                    `;
                }).join('');
            }
        }


        // Greenhouse Functions
        async function requestGreenhouseConnection() {
            const select = document.getElementById('greenhouse-sorting-center-select');
            const targetId = select.value;
            if (!targetId) {
                showToast('لطفاً یک مرکز سورتینگ را انتخاب کنید', 'error');
                return;
            }
            await requestConnection(targetId, 'greenhouse');
        }

        async function disconnectFromCenter(connectionId) {
            const response = await api.deleteConnection(connectionId);

            if (response.success) {
                // The server should handle notifying the other party.
                showToast('اتصال با موفقیت لغو شد', 'success');
                
                await loadDataFromServer();
                if (currentUser.role === 'greenhouse') {
                    loadGreenhouseConnections();
                    loadSortingCenters();
                } else if (currentUser.role === 'driver') {
                    loadDriverConnections();
                } else if (currentUser.role === 'sorting') {
                    loadSortingConnectionRequests();
                    loadSortingApprovedConnections();
                }
            } else {
                showToast(response.message || 'خطا در قطع اتصال.', 'error');
            }
        }

        function loadGreenhouseConnections() {
            const container = document.getElementById('greenhouse-connections-list');
            if (!container) return;

            // --- Part 1: Ensure the form structure exists ---
            if (!container.innerHTML.trim()) {
                const formHtml = `
                    <div class="flex items-center space-x-2 space-x-reverse border-b pb-4 mb-4">
                        <select id="greenhouse-sorting-center-select" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 bg-white">
                            <option value="">انتخاب مرکز سورتینگ...</option>
                        </select>
                        <button onclick="requestGreenhouseConnection()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg whitespace-nowrap">
                            <i class="fas fa-plus ml-2"></i>
                            افزودن
                        </button>
                    </div>
                    <div id="greenhouse-current-connections" class="space-y-3">
                        <!-- List will be populated below -->
                    </div>
                `;
                container.innerHTML = formHtml;
            }

            // Get all connections for the current greenhouse
            const myConnections = connections.filter(c => c.sourceId === currentUser.id && c.sourceRole === 'greenhouse');

            // --- Part 2: Update the dropdown with *available* centers ---
            const select = document.getElementById('greenhouse-sorting-center-select');
            const selectedValue = select.value; // Store current selection

            const allSortingCenters = users.filter(u => u.role === 'sorting');
            const connectedCenterIds = myConnections.map(c => c.targetId);
            const availableCenters = allSortingCenters.filter(center => !connectedCenterIds.includes(center.id));
            
            // Clear existing options but keep the placeholder
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add new, available centers
            availableCenters.forEach(center => {
                const option = document.createElement('option');
                option.value = center.id;
                option.textContent = center.fullname;
                select.appendChild(option);
            });
            
            // Restore selection
            select.value = selectedValue;
            if (!select.value) { // If the previously selected option is no longer available, reset to placeholder
                select.selectedIndex = 0;
            }

            // --- Part 3: Update the list of *current* connections ---
            const currentConnectionsContainer = document.getElementById('greenhouse-current-connections');
            if (myConnections.length === 0) {
                currentConnectionsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">هنوز اتصالی برقرار نشده است.</p>';
            } else {
                currentConnectionsContainer.innerHTML = myConnections.map(conn => {
                    const center = users.find(u => u.id === conn.targetId);
                    let statusText, statusClass;
                    switch(conn.status) {
                        case 'pending': statusText = 'در انتظار تایید'; statusClass = 'bg-yellow-100 text-yellow-800'; break;
                        case 'approved': statusText = 'تایید شده'; statusClass = 'bg-green-100 text-green-800'; break;
                        default: statusText = 'نامشخص'; statusClass = 'bg-gray-100 text-gray-800';
                    }
                    return `
                        <div class="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                            <div>
                                <h4 class="font-semibold">${center ? center.fullname : 'مرکز حذف شده'}</h4>
                                <p class="text-sm font-medium px-2 py-1 rounded-full inline-block ${statusClass}">${statusText}</p>
                            </div>
                            <button onclick="disconnectFromCenter(${conn.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
                                لغو اتصال
                            </button>
                        </div>
                    `;
                }).join('');
            }
        }

        function loadSortingCenters() {
            const approvedConnections = connections.filter(c => c.sourceId === currentUser.id && c.status === 'approved');
            const connectedCenterIds = approvedConnections.map(c => c.targetId);
            const sortingCenters = users.filter(u => u.role === 'sorting' && connectedCenterIds.includes(u.id));

            const select = document.getElementById('sorting-center');
            const selectedValue = select.value; // Store current value

            select.innerHTML = '<option value="">انتخاب مرکز سورتینگ...</option>';

            if (sortingCenters.length === 0) {
                select.innerHTML = '<option value="">ابتدا باید به یک مرکز سورتینگ متصل شوید</option>';
            }

            sortingCenters.forEach(center => {
                const option = document.createElement('option');
                option.value = center.id;
                option.textContent = center.fullname;
                select.appendChild(option);
            });

            select.value = selectedValue; // Restore selected value
        }

        async function submitRequest(event) {
            event.preventDefault();
            
            const type = document.getElementById('request-type').value;
            const quantity = parseInt(document.getElementById('request-quantity').value);
            const sortingCenterId = document.getElementById('sorting-center').value;
            const description = document.getElementById('request-description').value;
            
            if (!sortingCenterId) {
                showToast('لطفاً یک مرکز سورتینگ را انتخاب کنید.', 'error');
                return;
            }
            if (!quantity || quantity <= 0) {
                showToast('لطفاً تعداد را به درستی وارد کنید.', 'error');
                return;
            }

            const sortingCenter = users.find(u => u.id == sortingCenterId);
            
            const requestData = {
                greenhouseId: currentUser.id,
                greenhouseName: currentUser.fullname,
                greenhousePhone: currentUser.phone,
                greenhouseAddress: currentUser.address,
                sortingCenterId: parseInt(sortingCenterId),
                sortingCenterName: sortingCenter.fullname,
                type,
                quantity,
                description,
                location: currentUser.location,
                createdAt: new Date().toISOString()
            };

            const response = await api.createRequest(requestData);

            if (response.success) {
                // Server should notify the sorting center.
                showToast('درخواست با موفقیت ارسال شد', 'success');
                event.target.reset();
                await loadDataFromServer();
                loadGreenhouseRequests();
            } else {
                showToast(response.message || 'خطا در ارسال درخواست.', 'error');
            }
        }

        async function confirmFirstStep(requestId) {
            const response = await api.updateRequest(requestId, { isPickupConfirmed: true });
            if (response.success) {
                // Server should notify the other party.
                const isDriver = currentUser.role === 'driver';
                const toastMessage = isDriver
                    ? 'دریافت بار تایید شد. منتظر تایید گلخانه‌دار...'
                    : 'دریافت بار تایید شد. منتظر تایید راننده...';
                showToast(toastMessage, 'success');
                
                await loadDataFromServer();
                if (isDriver) {
                    loadDriverActiveMission();
                } else {
                    loadGreenhouseRequests();
                }
            }
        }

        async function confirmSecondStep(requestId) {
            await loadDataFromServer();
            const request = requests.find(r => r.id === requestId);

            if (request && request.isPickupConfirmed) {
                const updates = {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                    isConsolidated: request.type === 'full' ? false : undefined
                };

                const response = await api.updateRequest(requestId, updates);
                if (response.success) {
                    // Server should notify all parties.
                    
                    // Stop tracking and clear the route from the map
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage('stop-tracking');
                    }
                    clearDriverWatcher();
                    clearRoute(driverMainMap);

                    showToast('تحویل با موفقیت تایید شد. ماموریت تکمیل شد.', 'success');
                    
                    await loadDataFromServer(); // Reload data
                    const isDriver = currentUser.role === 'driver';
                    if (isDriver) {
                        loadDriverActiveMission();
                        loadDriverStatus();
                        filterDriverReports();
                    } else {
                        loadGreenhouseRequests();
                        filterGreenhouseReports();
                    }
                    refreshAllMapMarkers();
                } else {
                    showToast(response.message || 'خطا در تکمیل ماموریت.', 'error');
                }
            } else {
                const toastMessage = (currentUser.role === 'driver')
                    ? 'ابتدا باید گلخانه‌دار دریافت را تایید کند.'
                    : 'ابتدا باید راننده دریافت را تایید کند.';
                showToast(toastMessage, 'error');
            }
        }

        function loadFarmerData() {
            // In a real app, you would load farmer-specific data here.
        }

        function loadBuyerData() {
            // In a real app, you would load buyer-specific data here.
        }

        async function cancelRequest(requestId) {
            if (!confirm('آیا از لغو این درخواست مطمئن هستید؟')) return;

            await loadDataFromServer();
            const request = requests.find(r => r.id === requestId);

            if (request && request.status === 'pending') {
                const response = await api.deleteRequest(requestId);
                if (response.success) {
                    // Server should notify sorting center.
                    showToast('درخواست با موفقیت لغو شد.', 'success');
                    await loadDataFromServer();
                    loadGreenhouseRequests();
                } else {
                    showToast(response.message || 'خطا در لغو درخواست.', 'error');
                }
            } else {
                showToast('این درخواست دیگر قابل لغو نیست.', 'error');
            }
        }

        function loadGreenhouseRequests() {
            const activeRequests = requests.filter(r => 
                r.greenhouseId === currentUser.id && 
                ['pending', 'assigned', 'in_progress', 'delivering'].includes(r.status)
            );
            
            const container = document.getElementById('greenhouse-active-requests');
            
            if (activeRequests.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">درخواست فعالی وجود ندارد</p>';
                return;
            }
            
            container.innerHTML = activeRequests.map(request => `
                <div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h4 class="font-semibold text-lg">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'} - ${request.quantity} عدد</h4>
                            <p class="text-gray-600 text-sm">به ${request.sortingCenterName}</p>
                            ${request.description ? `<p class="text-gray-500 text-sm">${request.description}</p>` : ''}
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(request.status)}">
                            ${getStatusText(request.status)}
                        </span>
                    </div>
                    <div class="mt-4 flex items-center space-x-2 space-x-reverse">
                        ${request.status === 'pending' ? `
                            <button onclick="cancelRequest(${request.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
                                <i class="fas fa-times ml-1"></i>
                                لغو درخواست
                            </button>
                        ` : ''}
                    </div>
                    ${request.driverName ? `
                        <div class="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <div class="bg-blue-100 p-2 rounded-full ml-3">
                                        <i class="fas fa-user-tie text-blue-600"></i>
                                    </div>
                                    <div>
                                        <span class="text-gray-800 font-semibold">راننده: ${request.driverName}</span>
                                        <p class="text-gray-500 text-sm">تلفن: ${request.driverPhone || '-'}</p>
                                        <p class="text-gray-500 text-sm">پلاک: ${request.driverLicensePlate || '-'}</p>
                                    </div>
                                </div>
                                <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                            </div>
                            
                            <div class="mt-4 space-y-3">
                                ${request.status === 'assigned' ? `
                                    <div class="flex items-center justify-center bg-blue-100 px-6 py-3 rounded-lg border border-blue-200">
                                        <div class="w-4 h-4 bg-blue-500 rounded-full pulse-dot ml-3"></div>
                                        <div class="text-center">
                                            <div class="text-blue-700 font-medium">راننده در راه است...</div>
                                            <div class="text-blue-600 text-xs">تخمین زمان رسیدن: ۱۵-۳۰ دقیقه</div>
                                        </div>
                                    </div>
                                ` : ''}
                                

                                
                                ${request.status === 'in_progress' && request.type === 'full' ? `
                                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div class="text-center mb-4">
                                            <div class="text-blue-700 font-medium mb-2">راننده در محل شماست</div>
                                            <div class="text-blue-600 text-sm">لطفا پس از تایید راننده، تحویل بار را تایید کنید</div>
                                        </div>
                                        <div class="flex justify-center">
                                            <button onclick="confirmSecondStep(${request.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg ${!request.isPickupConfirmed ? 'opacity-50 cursor-not-allowed' : ''}" ${!request.isPickupConfirmed ? 'disabled' : ''}>
                                                <i class="fas fa-truck-loading ml-2"></i>
                                                تحویل دادم
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}

                                ${request.status === 'in_progress' && request.type === 'empty' ? `
                                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div class="text-center mb-4">
                                            <div class="text-green-700 font-medium mb-2">راننده سبدهای خالی را تحویل می‌دهد</div>
                                            <div class="text-green-600 text-sm">لطفاً دریافت سبدها را تایید کنید</div>
                                        </div>
                                        <div class="flex justify-center">
                                            <button onclick="confirmFirstStep(${request.id})" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg">
                                                <i class="fas fa-check-circle ml-2"></i>
                                                تحویل گرفتم
                                            </button>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }


        async function rejectRequestBySorting(requestId) {
            if (!confirm('آیا از رد کردن این درخواست مطمئن هستید؟')) return;

            await loadDataFromServer();
            const request = requests.find(r => r.id === requestId);

            if (request) {
                const response = await api.deleteRequest(requestId);
                if (response.success) {
                    // Server should notify greenhouse.
                    showToast('درخواست با موفقیت رد شد.', 'success');
                    await loadDataFromServer();
                    loadSortingRequests();
                    loadAvailableDrivers();
                } else {
                     showToast(response.message || 'خطا در رد کردن درخواست.', 'error');
                }
            }
        }

        // Sorting Functions
        function loadSortingRequests() {
            const connectedGreenhouseIds = connections
                .filter(c => c.targetId === currentUser.id && c.sourceRole === 'greenhouse' && c.status === 'approved')
                .map(c => c.sourceId);

            const pendingRequests = requests.filter(r => 
                r.sortingCenterId === currentUser.id && 
                r.status === 'pending' &&
                connectedGreenhouseIds.includes(r.greenhouseId)
            );
            
            const container = document.getElementById('sorting-pending-requests');
            
            if (pendingRequests.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">درخواستی در انتظار نیست</p>';
                return;
            }
            
            container.innerHTML = pendingRequests.map(request => `
                <div class="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h4 class="font-semibold">${request.greenhouseName}</h4>
                    <p class="text-sm text-gray-600">تلفن: ${request.greenhousePhone || '-'}</p>
                    <p class="text-sm text-gray-600">آدرس: ${request.greenhouseAddress || '-'}</p>
                            <p class="text-gray-600 text-sm">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'} - ${request.quantity} عدد</p>
                            ${request.description ? `<p class="text-gray-500 text-sm">${request.description}</p>` : ''}
                        </div>
                        <span class="text-gray-500 text-sm">${formatDate(request.createdAt)}</span>
                    </div>
                    <button onclick="autoAssignDriver(${request.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                        انتخاب راننده
                    </button>
                    <button onclick="rejectRequestBySorting(${request.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm">
                        رد درخواست
                    </button>
                </div>
            `).join('');
        }

        function loadAvailableDrivers() {
            const connectedDriverIds = connections
                .filter(c => c.targetId === currentUser.id && c.sourceRole === 'driver' && c.status === 'approved' && !c.suspended)
                .map(c => c.sourceId);

            // Filter drivers who are connected and not currently on a mission
            const availableDrivers = users.filter(u => 
                u.role === 'driver' &&
                connectedDriverIds.includes(u.id) &&
                !requests.some(r => 
                    r.driverId === u.id && 
                    ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status)
                )
            );
            
            const emptyBasketDrivers = availableDrivers.filter(u => u.emptyBaskets > 0);
            const loadingDrivers = availableDrivers.filter(u => u.loadCapacity > 0 && (!u.emptyBaskets || u.emptyBaskets === 0));
            
            // Empty basket drivers
            const emptyContainer = document.getElementById('empty-basket-drivers');
            if (emptyBasketDrivers.length === 0) {
                emptyContainer.innerHTML = '<p class="text-gray-500 text-center py-4">راننده‌ای در دسترس نیست</p>';
            } else {
                emptyContainer.innerHTML = emptyBasketDrivers.map(driver => `
                    <div class="border border-green-200 bg-green-50 rounded-lg p-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <h5 class="font-semibold">${driver.fullname}</h5>
                                <p class="text-gray-600 text-sm">سبد خالی: ${driver.emptyBaskets}</p>
                                <p class="text-gray-500 text-xs">${driver.phone} | ${driver.licensePlate}</p>
                            </div>
                            <span class="text-green-600 text-sm">آماده</span>
                        </div>
                    </div>
                `).join('');
            }
            
            // Loading drivers
            const loadingContainer = document.getElementById('loading-drivers');
            if (loadingDrivers.length === 0) {
                loadingContainer.innerHTML = '<p class="text-gray-500 text-center py-4">راننده‌ای در دسترس نیست</p>';
            } else {
                loadingContainer.innerHTML = loadingDrivers.map(driver => `
                    <div class="border border-blue-200 bg-blue-50 rounded-lg p-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <h5 class="font-semibold">${driver.fullname}</h5>
                                <p class="text-gray-600 text-sm">ظرفیت بارگیری: ${driver.loadCapacity}</p>
                                <p class="text-gray-500 text-xs">${driver.phone} | ${driver.licensePlate}</p>
                            </div>
                            <span class="text-blue-600 text-sm">آماده</span>
                        </div>
                    </div>
                `).join('');
            }
        }

        async function autoAssignDriver(requestId) {
            await loadDataFromServer();
            const requestIndex = requests.findIndex(r => r.id === requestId);
            if (requestIndex === -1) return;
            
            const request = requests[requestIndex];

            const connectedDriverIds = connections
                .filter(c => c.targetId === currentUser.id && c.sourceRole === 'driver' && c.status === 'approved' && !c.suspended)
                .map(c => c.sourceId);

            // 1. Find potential drivers (connected and not on a mission)
            let potentialDrivers = users.filter(u =>
                u.role === 'driver' &&
                connectedDriverIds.includes(u.id) &&
                !requests.some(r => r.driverId === u.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status))
            );
            
            // 2. Filter by capacity
            let capacityMatchingDrivers = [];
            if (request.type === 'empty') {
                capacityMatchingDrivers = potentialDrivers.filter(u => u.emptyBaskets >= request.quantity);
            } else { // 'full'
                capacityMatchingDrivers = potentialDrivers.filter(u => u.loadCapacity >= request.quantity);
            }

            if (capacityMatchingDrivers.length === 0) {
                showToast('راننده‌ای با ظرفیت مناسب یافت نشد.', 'error');
                return;
            }

            // 3. From those with capacity, find the ones with a location
            const locatedDrivers = capacityMatchingDrivers.filter(d => d.location);

            if (locatedDrivers.length === 0) {
                showToast('راننده‌ای با موقعیت مکانی مشخص یافت نشد.', 'error');
                return;
            }

            // 4. Find the closest driver from the final list
            const closestDriver = findClosestDriver(locatedDrivers, request.location);
            
            if (closestDriver) {
                assignDriverToRequest(requestId, closestDriver.id);
                showToast(`درخواست به ${closestDriver.fullname} اختصاص داده شد`, 'success');
            } else {
                // This case should not be reached if locatedDrivers.length > 0, but as a fallback:
                showToast('خطا در یافتن نزدیک‌ترین راننده.', 'error');
            }
        }

        function findClosestDriver(drivers, location) {
            let bestDriver = null;
            let minDistance = Infinity;
            
            drivers.forEach(driver => {
                // We assume location is present because it's pre-filtered
                const distance = calculateDistance(location, driver.location);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestDriver = driver;
                }
            });
            
            return bestDriver;
        }

        function calculateDistance(loc1, loc2) {
            const R = 6371; // Earth's radius in km
            const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
            const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        async function assignDriverToRequest(requestId, driverId) {
            await loadDataFromServer();
            const driver = users.find(u => u.id === driverId);
            const request = requests.find(r => r.id === requestId);

            if (driver && request) {
                const updates = {
                    status: 'assigned',
                    driverId: driverId,
                    driverName: driver.fullname,
                    driverPhone: driver.phone,
                    driverLicensePlate: driver.licensePlate,
                    assignedAt: new Date().toISOString()
                };

                const response = await api.updateRequest(requestId, updates);
                if (response.success) {
                    // Server should notify driver and greenhouse.
                    showToast(`درخواست به ${driver.fullname} اختصاص داده شد`, 'success');
                    await loadDataFromServer();
                    loadSortingRequests();
                    loadAvailableDrivers();
                } else {
                    showToast(response.message || 'خطا در اختصاص راننده.', 'error');
                }
            }
        }

        // Driver Functions
        function loadDriverStatus() {
            document.getElementById('driver-empty-baskets-display').textContent = currentUser.emptyBaskets || 0;
            document.getElementById('driver-load-capacity-display').textContent = currentUser.loadCapacity || 0;
            document.getElementById('empty-baskets-count').value = currentUser.emptyBaskets || 0;
            document.getElementById('load-capacity').value = currentUser.loadCapacity || 0;
            
            const todayTrips = requests.filter(r => 
                r.driverId === currentUser.id && 
                r.status === 'completed' &&
                new Date(r.completedAt).toDateString() === new Date().toDateString()
            ).length;
            
            document.getElementById('driver-trips-count').textContent = todayTrips;

            const isOnMission = requests.some(r => r.driverId === currentUser.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status));
            const approvedConnections = connections.filter(c => c.sourceId === currentUser.id && c.status === 'approved' && c.sourceRole === 'driver');

            const submitBtn = document.getElementById('submit-daily-status-btn');
            const completeBtn = document.getElementById('complete-loading-btn');

            if(submitBtn) submitBtn.disabled = isOnMission;
            // Button should be disabled if on a mission, not connected, or if they have capacity/baskets.
            if(completeBtn) completeBtn.disabled = isOnMission || approvedConnections.length === 0 || (currentUser.emptyBaskets || 0) > 0 || (currentUser.loadCapacity || 0) > 0;
        }

        async function completeLoadingProcess() {
            await loadDataFromServer();

            // 1. Prerequisite checks
            const isOnMission = requests.some(r => r.driverId === currentUser.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status));
            if (isOnMission) {
                showToast('شما در حال حاضر در یک ماموریت فعال هستید.', 'error');
                return;
            }
            const approvedConnections = connections.filter(c => c.sourceId === currentUser.id && c.status === 'approved' && c.sourceRole === 'driver');
            if (approvedConnections.length === 0) {
                showToast('برای شروع تحویل، باید به یک مرکز سورتینگ متصل باشید.', 'error');
                return;
            }
            if (approvedConnections.length > 1) {
                showToast('شما به چند مرکز متصل هستید. لطفا فقط به یک مرکز متصل بمانید.', 'error');
                return;
            }
            if ((currentUser.emptyBaskets || 0) > 0 || (currentUser.loadCapacity || 0) > 0) {
                showToast('راننده نباید هیچ سبد خالی یا ظرفیت بارگیری اضافی داشته باشد.', 'error');
                return;
            }

            const sortingCenter = users.find(u => u.id === approvedConnections[0].targetId);
            if (!sortingCenter) {
                showToast('مرکز سورتینگ متصل یافت نشد.', 'error');
                return;
            }

            // 2. Find missions to consolidate
            const missionsToConsolidate = requests.filter(r => 
                r.driverId === currentUser.id &&
                r.status === 'completed' &&
                r.type === 'full' &&
                r.isConsolidated === false
            );

            if (missionsToConsolidate.length === 0) {
                showToast('هیچ بار تکمیل شده‌ای برای تحویل به مرکز وجود ندارد.', 'info');
                return;
            }

            // 3. Call the new API to handle the entire consolidation and creation process
            const response = await api.createConsolidatedDelivery(missionsToConsolidate, currentUser, sortingCenter);

            if (response.success) {
                showToast('فرایند تحویل به مرکز سورتینگ آغاز شد.', 'success');
                
                await loadDataFromServer();
                loadDriverStatus();
                loadDriverActiveMission();
                filterDriverReports();
                refreshAllMapMarkers();

                // 4. Update UI (Map and Route)
                const activeMission = response.request; // The API returns the new request
                document.getElementById('driver-main-map').scrollIntoView({ behavior: 'smooth' });
                
                // The destination is the sorting center, which is stored in the new request
                activeMission.location = sortingCenter.location;
                await updateRoute(activeMission, driverMainMap);
                startGPSNavigation(activeMission);

                const destination = L.latLng(sortingCenter.location.lat, sortingCenter.location.lng);
                const driverLocation = L.latLng(currentUser.location.lat, currentUser.location.lng);
                const group = new L.featureGroup([L.marker(driverLocation), L.marker(destination)]);
                driverMainMap.fitBounds(group.getBounds().pad(0.15));
            } else {
                showToast(response.message || 'خطا در شروع فرایند تحویل.', 'error');
            }
        }

        function adjustEmptyBaskets(change) {
            const input = document.getElementById('empty-baskets-count');
            const currentValue = parseInt(input.value) || 0;
            const newValue = Math.max(0, currentValue + change);
            input.value = newValue;
            updateDriverCapacityUI();
        }

        function adjustLoadCapacity(change) {
            const input = document.getElementById('load-capacity');
            const currentValue = parseInt(input.value) || 0;
            const newValue = Math.max(0, currentValue + change);
            input.value = newValue;
            updateDriverCapacityUI();
        }

        async function submitDailyStatus() {
            const emptyBaskets = parseInt(document.getElementById('empty-baskets-count').value) || 0;
            const loadCapacity = parseInt(document.getElementById('load-capacity').value) || 0;

            if (emptyBaskets > 0 && loadCapacity > 0) {
                showToast('راننده نمی‌تواند همزمان سبد خالی و ظرفیت بارگیری داشته باشد.', 'error');
                return;
            }
            
            const updates = {
                emptyBaskets: emptyBaskets,
                loadCapacity: loadCapacity,
                dailyStatusSubmitted: true,
                lastStatusUpdate: new Date().toISOString()
            };

            const response = await api.updateUser(currentUser.id, updates);

            if (response.success) {
                // Update local user object
                Object.assign(currentUser, updates);
                
                showToast('وضعیت روزانه با موفقیت ثبت شد', 'success');
                loadDriverStatus();
                // Server should handle notifying connected sorting centers.
            } else {
                showToast(response.message || 'خطا در ثبت وضعیت.', 'error');
            }
        }

        function loadDriverRequests() {
            const pendingRequests = requests.filter(r => 
                r.driverId === currentUser.id && 
                r.status === 'assigned'
            );
            
            const container = document.getElementById('driver-pending-requests');
            
            if (pendingRequests.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">درخواستی دریافت نکرده‌اید</p>';
                return;
            }
            
            container.innerHTML = pendingRequests.map(request => `
                <div class="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h4 class="font-semibold">${request.greenhouseName}</h4>
                            <p class="text-sm text-gray-600">تلفن: ${request.greenhousePhone || '-'}</p>
                            <p class="text-xs text-gray-500">آدرس: ${request.greenhouseAddress || '-'}</p>
                            <p class="text-gray-600 text-sm">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'} - ${request.quantity} عدد</p>
                            <p class="text-gray-500 text-sm">مرکز سورتینگ: ${request.sortingCenterName}</p>
                        </div>
                        <span class="text-blue-600 text-sm">${formatDate(request.assignedAt)}</span>
                    </div>
                    <div class="flex space-x-2 space-x-reverse">
                        <button onclick="acceptRequest(${request.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
                            پذیرش
                        </button>
                        <button onclick="rejectRequest(${request.id})" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm">
                            رد
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function acceptRequest(requestId) {
            const updates = {
                status: 'in_progress',
                acceptedAt: new Date().toISOString()
            };

            // The server should handle updating the driver's capacity in the same transaction.
            const response = await api.updateRequest(requestId, updates);

            if (response.success) {
                showToast('درخواست پذیرفته شد. مسیریابی فعال شد.', 'success');

                // The server is now the source of truth. We just need to reload all data.
                await loadDataFromServer();

                // The capacity/basket count for the driver will be updated from the server response.
                // We need to update the currentUser object with the new data.
                const updatedSelf = users.find(u => u.id === currentUser.id);
                if (updatedSelf) {
                    currentUser = updatedSelf;
                }
                
                loadDriverRequests();
                loadDriverActiveMission();
                loadDriverStatus();

                // Find the accepted request to start navigation
                const request = requests.find(r => r.id === requestId);
                if (request) {
                    await updateRoute(request, driverMainMap);
                    startGPSNavigation(request);

                    const destination = L.latLng(request.location.lat, request.location.lng);
                    const driverLocation = L.latLng(currentUser.location.lat, currentUser.location.lng);
                    const group = new L.featureGroup([L.marker(driverLocation), L.marker(destination)]);
                    driverMainMap.fitBounds(group.getBounds().pad(0.15));
                    document.getElementById('driver-main-map').scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                showToast(response.message || 'خطا در پذیرش درخواست.', 'error');
            }
        }

        async function rejectRequest(requestId) {
            const updates = {
                status: 'pending',
                driverId: null,
                driverName: null,
                assignedAt: null
            };
            // In a real app, you might have a specific endpoint for this, like /api/requests/:id/unassign
            const response = await api.updateRequest(requestId, updates);

            if (response.success) {
                // Server should notify sorting center.
                showToast('درخواست رد شد', 'success');
                await loadDataFromServer();
                loadDriverRequests();
            } else {
                showToast(response.message || 'خطا در رد کردن درخواست.', 'error');
            }
        }

        function clearDriverWatcher() {
            if (driverWatcher.id !== null) {
                if (driverWatcher.type === 'watch') {
                    navigator.geolocation.clearWatch(driverWatcher.id);
                }
                driverWatcher = { id: null, type: null };
            }
            isNavigating = false; // Always reset flag when watcher is cleared
        }

        function clearRoute(mapInstance) {
            if (!mapInstance) return;
            mapInstance.eachLayer(function(layer) {
                if (layer instanceof L.Polyline && layer.options.className === 'route-line') {
                    mapInstance.removeLayer(layer);
                }
            });
        }

        function loadDriverActiveMission() {
            const activeMission = requests.find(r => 
                r.driverId === currentUser.id && 
                ['in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status)
            );
            
            const container = document.getElementById('driver-active-mission');
            
            if (!activeMission) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8">ماموریت فعالی ندارید</p>';
                return;
            }

            let missionTitle, missionDetails;
            if (activeMission.type === 'sorting_delivery' || activeMission.type === 'delivered_basket') {
                missionTitle = `تحویل به ${activeMission.sortingCenterName}`;
                missionDetails = `<p class="text-gray-600 text-sm">${activeMission.description}</p>`;
            } else {
                missionTitle = `ماموریت به ${activeMission.greenhouseName}`;
                missionDetails = `
                    <p class="text-sm text-gray-600">نوع: ${activeMission.type === 'empty' ? 'سبد خالی' : 'سبد پر'} - ${activeMission.quantity} عدد</p>
                    <p class="text-sm text-gray-600">تلفن: ${activeMission.greenhousePhone || '-'}</p>
                    <p class="text-xs text-gray-500">آدرس: ${activeMission.greenhouseAddress || 'درحال بارگذاری...'}</p>
                `;
            }

            container.innerHTML = `
                <div class="border border-green-200 bg-green-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div>
                            <h4 class="font-semibold">${missionTitle}</h4>
                            ${missionDetails}
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm ${getStatusClass(activeMission.status)}">
                            ${getStatusText(activeMission.status)}
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="openExternalNavigation(${activeMission.location.lat}, ${activeMission.location.lng})" class="route-button text-white px-4 py-2 rounded text-sm">
                            <i class="fas fa-route ml-1"></i>
                            مسیریابی خارجی
                        </button>
                        ${(activeMission.type !== 'sorting_delivery' && activeMission.type !== 'delivered_basket') ? `
                            <!-- Full Basket Logic for Driver -->
                            ${activeMission.type === 'full' && !activeMission.isPickupConfirmed ? `
                                <button onclick="confirmFirstStep(${activeMission.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                                    تحویل گرفتم
                                </button>
                            ` : ''}
                            ${activeMission.type === 'full' && activeMission.isPickupConfirmed ? `
                                <div class="bg-gray-200 text-gray-600 px-4 py-2 rounded text-sm">
                                    منتظر تایید گلخانه‌دار...
                                </div>
                            ` : ''}

                            <!-- Empty Basket Logic for Driver -->
                            ${activeMission.type === 'empty' && !activeMission.isPickupConfirmed ? `
                                <div class="bg-gray-200 text-gray-600 px-4 py-2 rounded text-sm">
                                    منتظر تایید گلخانه‌دار...
                                </div>
                            ` : ''}
                            ${activeMission.type === 'empty' && activeMission.isPickupConfirmed ? `
                                <button onclick="confirmSecondStep(${activeMission.id})" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
                                    تحویل دادم
                                </button>
                            ` : ''}
                        ` : ''}
                    </div>
                </div>
            `;
        }

        function broadcastUserUpdate(userId) {
            const user = users.find(u => u.id === userId);
            if (!user || !user.location) return;

            const activeRequest = user.role === 'driver'
                ? requests.find(r => r.driverId === user.id && ['assigned', 'in_progress', 'delivering', 'in_progress_to_sorting'].includes(r.status))
                : null;

            const publicMaps = [greenhouseMap, sortingMap, driverMainMap, farmerMap, buyerMap];

            publicMaps.forEach(map => {
                if (map && map.userMarkers && map.userMarkers[userId]) {
                    const marker = map.userMarkers[userId];
                    const isCurrentUser = user.id === (currentUser ? currentUser.id : -1);

                    marker.setLatLng([user.location.lat, user.location.lng]);
                    marker.setIcon(getMarkerIcon(user.role, user, activeRequest));
                    // The popup content still needs a simple boolean for active status
                    marker.setPopupContent(getMarkerPopupContent(user, !!activeRequest, isCurrentUser));
                }
            });

            if (driverMap && driverLocationMarker && currentUser && userId === currentUser.id && currentUser.role === 'driver') {
                driverLocationMarker.setLatLng([user.location.lat, user.location.lng]);
            }
        }

        function startGPSNavigation(request) {
            clearDriverWatcher();
            isNavigating = true; // Set navigation flag for both real and simulated GPS

            if (navigator.geolocation) {
                const watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        currentUser.location = { lat: position.coords.latitude, lng: position.coords.longitude };
                        updateDriverLocationInStorage();
                        broadcastUserUpdate(currentUser.id);
                        updateLastUpdateTime();
                    },
                    (error) => {
                        console.log('Navigation GPS Error:', error, 'Falling back to simulation.');
                        startSimulatedNavigation(request); // Fallback to simulation on error
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
                driverWatcher = { id: watchId, type: 'watch' };
            } else {
                console.log('Geolocation not supported. Falling back to simulation.');
                showToast('GPS پشتیبانی نمی‌شود. شبیه‌ساز حرکت فعال شد.', 'info');
                startSimulatedNavigation(request);
            }
        }
        
        function moveAlongPath(path, currentLatLng, currentIndex, distanceToMove) {
            let remainingDistance = distanceToMove;

            for (let i = currentIndex; i < path.length - 1; i++) {
                const segmentStart = (i === currentIndex) ? currentLatLng : L.latLng(path[i]);
                const segmentEnd = L.latLng(path[i + 1]);
                const segmentDistance = segmentStart.distanceTo(segmentEnd);

                if (remainingDistance <= segmentDistance) {
                    const ratio = remainingDistance / segmentDistance;
                    if (segmentDistance === 0) return { latlng: segmentStart, newIndex: i }; // Avoid division by zero
                    
                    const newLat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * ratio;
                    const newLng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * ratio;
                    return {
                        latlng: L.latLng(newLat, newLng),
                        newIndex: i 
                    };
                } else {
                    remainingDistance -= segmentDistance;
                }
            }

            return {
                latlng: L.latLng(path[path.length - 1]),
                newIndex: path.length - 1
            };
        }

        function startSimulatedNavigation(request) {
            clearDriverWatcher();

            if (!request.routePath || request.routePath.length < 2) {
                console.error("Not enough points in route path for simulation.");
                return;
            }

            request.routeIndex = request.routeIndex || 0;
            request.currentSimLatLng = request.currentSimLatLng || L.latLng(request.routePath[0]);

            const speed = 1000 / 120; // meters per second (1km per 2 minutes)
            let lastTimestamp = performance.now();

            function animationLoop(timestamp) {
                if (driverWatcher.type !== 'simulation') return;

                const deltaTime = (timestamp - lastTimestamp) / 1000;
                lastTimestamp = timestamp;
                const distanceToTravel = speed * deltaTime;

                const result = moveAlongPath(request.routePath, request.currentSimLatLng, request.routeIndex, distanceToTravel);
                
                request.currentSimLatLng = result.latlng;
                currentUser.location = { lat: result.latlng.lat, lng: result.latlng.lng };
                
                updateDriverLocationInStorage();
                broadcastUserUpdate(currentUser.id);
                updateLastUpdateTime();

                if (result.newIndex >= request.routePath.length - 1) {
                    clearDriverWatcher();
                } else {
                    requestAnimationFrame(animationLoop);
                }
            }
            
            driverWatcher = { id: true, type: 'simulation' };
            requestAnimationFrame(animationLoop);
        }

        function updateLastUpdateTime(date = new Date()) {
            const timeElement = document.getElementById('last-update-time');
            if (timeElement) {
                timeElement.textContent = date.toLocaleTimeString('fa-IR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }

        // Store a snapshot of data to detect changes
        let dataSnapshot = {};

        // Global audio object for notification sound to handle autoplay policies
        const notificationSound = new Audio('soodcity_notification.mp3');
        notificationSound.muted = true; // Start muted

        // Add a one-time event listener to unlock audio on the first user interaction
        document.body.addEventListener('click', () => {
            notificationSound.play().catch(() => {}); // Play and ignore any initial errors
            notificationSound.muted = false; // Unmute for future plays
        }, { once: true });

        function updateDataSnapshot() {
            if (!currentUser) {
                dataSnapshot = {};
                return;
            }
            dataSnapshot = {
                messages: messages.filter(m => m.recipientId === currentUser.id).length,
                pendingRequests: (currentUser.role === 'sorting') ? requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'pending').length : 0,
                assignedMissions: (currentUser.role === 'driver') ? requests.filter(r => r.driverId === currentUser.id && r.status === 'assigned').length : 0,
                connectionRequests: (currentUser.role === 'sorting') ? connections.filter(c => c.targetId === currentUser.id && c.status === 'pending').length : 0
            };
        }

        function checkForNewNotifications() {
            if (!currentUser || Object.keys(dataSnapshot).length === 0) {
                return; // Don't check if there's no user or no snapshot
            }

            // Compare current data (just loaded) with the snapshot from the last refresh cycle.
            const newMessageCount = messages.filter(m => m.recipientId === currentUser.id).length;
            if (newMessageCount > dataSnapshot.messages) {
                showBackgroundNotification('پیام جدید', 'شما یک پیام جدید در سود سیتی دارید.');
            }

            if (currentUser.role === 'sorting') {
                const newPendingRequestCount = requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'pending').length;
                if (newPendingRequestCount > dataSnapshot.pendingRequests) {
                    showBackgroundNotification('درخواست جدید', 'یک درخواست حمل و نقل جدید برای شما ثبت شد.');
                }

                const newConnectionRequestCount = connections.filter(c => c.targetId === currentUser.id && c.status === 'pending').length;
                if (newConnectionRequestCount > dataSnapshot.connectionRequests) {
                    showBackgroundNotification('درخواست اتصال', 'یک کاربر جدید میخواهد با شما ارتباط برقرار کند.');
                }
            }

            if (currentUser.role === 'driver') {
                const newAssignedMissionCount = requests.filter(r => r.driverId === currentUser.id && r.status === 'assigned').length;
                if (newAssignedMissionCount > dataSnapshot.assignedMissions) {
                    showBackgroundNotification('ماموریت جدید', 'یک ماموریت جدید به شما اختصاص داده شد.');
                }
            }
        }

        function drawFallbackRoute(request, mapInstance) {
            try {
                const fallbackPath = [
                    [currentUser.location.lat, currentUser.location.lng],
                    [request.location.lat, request.location.lng]
                ];
                request.routePath = fallbackPath;
                
                if (mapInstance) {
                    L.polyline(fallbackPath, {
                        color: '#ef4444', 
                        weight: 5,
                        opacity: 0.8,
                        dashArray: '15, 10',
                        className: 'route-line'
                    }).addTo(mapInstance);
                }
            } catch (fallbackError) {
                console.error('Error drawing fallback route:', fallbackError);
                showToast('خطا در ترسیم مسیر جایگزین.', 'error');
            }
        }

        async function updateRoute(request, mapInstance) {
            if (!mapInstance) {
                console.error("updateRoute called without a map instance. The map may not have initialized yet.");
                showToast('خطا: نقشه هنوز آماده نشده است. لطفا لحظه ای صبر کرده و دوباره امتحان کنید.', 'error');
                return;
            }

            mapInstance.eachLayer(function(layer) {
                if (layer instanceof L.Polyline && layer.options.className === 'route-line') {
                    mapInstance.removeLayer(layer);
                }
            });

            const start = `${currentUser.location.lng},${currentUser.location.lat}`;
            const end = `${request.location.lng},${request.location.lat}`;

            try {
                const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${start}&end=${end}`);
                if (!response.ok) {
                    throw new Error(`ORS request failed with status ${response.status}`);
                }
                const data = await response.json();

                if (data.features && data.features.length > 0) {
                    const coordinates = data.features[0].geometry.coordinates;
                    const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
                    request.routePath = latlngs; // Store the path for the simulator

                    if (mapInstance) {
                        const routeLine = L.polyline(latlngs, {
                            color: '#3b82f6',
                            weight: 5,
                            opacity: 0.8,
                            className: 'route-line'
                        }).addTo(mapInstance);
                        
                        const summary = data.features[0].properties.summary;
                        const distanceKm = (summary.distance / 1000).toFixed(2);
                        const durationMinutes = Math.ceil(summary.duration / 60);

                        L.popup()
                            .setLatLng(routeLine.getCenter())
                            .setContent(`<div class="text-center"><div class="font-semibold text-blue-600">فاصله تا مقصد</div><div class="text-lg font-bold">${distanceKm} کیلومتر</div><div class="text-xs text-gray-500">تخمین زمان: ${durationMinutes} دقیقه</div></div>`)
                            .openOn(mapInstance);
                    }
                } else {
                    console.warn('No features found in ORS response, drawing fallback route.', data);
                    showToast('مسیر بهینه یافت نشد. مسیر مستقیم نمایش داده می‌شود.', 'info');
                    drawFallbackRoute(request, mapInstance);
                }
            } catch (error) {
                console.error('Error fetching route:', error);
                showToast('خطا در دریافت مسیر از سرور. در حال نمایش مسیر مستقیم.', 'error');
                drawFallbackRoute(request, mapInstance);
            }
        }

        function openExternalNavigation(lat, lng) {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            
            if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                const appleUrl = `maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`;
                const googleUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
                
                window.open(appleUrl, '_blank');
                setTimeout(() => {
                    window.open(googleUrl, '_blank');
                }, 1000);
            }
            else if (/android/i.test(userAgent)) {
                const googleUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
                window.open(googleUrl, '_blank');
            }
            else {
                const googleUrl = `https://maps.google.com/maps?daddr=${lat},${lng}`;
                window.open(googleUrl, '_blank');
            }
            
            showToast('مسیریابی در اپلیکیشن خارجی باز شد', 'success');
        }

        // Report Functions
        function loadReports(reportType, data) {
            const tbodyId = `${reportType}-reports-body`;
            const tbody = document.getElementById(tbodyId);
            const colSpan = (reportType === 'sorting') ? 7 : 6;

            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${colSpan}" class="px-4 py-8 text-center text-gray-500">گزارشی وجود ندارد</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(request => {
                const driver = request.driverId ? getUser(request.driverId) : null;
                const licensePlate = driver ? driver.licensePlate : (request.driverLicensePlate || '-');

                if (reportType === 'greenhouse') {
                    return `
                        <tr class="border-b">
                            <td class="px-4 py-2">${formatDate(request.createdAt)}</td>
                            <td class="px-4 py-2">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'}</td>
                            <td class="px-4 py-2">${request.quantity}</td>
                            <td class="px-4 py-2">${request.driverName || '-'}</td>
                            <td class="px-4 py-2">${licensePlate}</td>
                            <td class="px-4 py-2">
                                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                            </td>
                        </tr>`;
                }
                if (reportType === 'sorting') {
                    if (request.type === 'delivered_basket') {
                        let rowClass = 'bg-yellow-50';
                        if (request.status === 'completed') rowClass = 'bg-indigo-50';
                        if (request.status === 'rejected') rowClass = 'bg-red-50';
                        // This single block now handles 'in_progress_to_sorting', 'completed', and 'rejected'
                        return `
                        <tr class="border-b ${rowClass}">
                            <td class="px-4 py-2">${formatDate(request.createdAt)}</td>
                            <td class="px-4 py-2">${request.greenhouseName}</td>
                            <td class="px-4 py-2">${request.driverName || '-'}</td>
                            <td class="px-4 py-2">${licensePlate}</td>
                            <td class="px-4 py-2 font-semibold">تحویل به مرکز</td>
                            <td class="px-4 py-2">${request.quantity}</td>
                            <td class="px-4 py-2">
                                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                                ${request.rejectionReason ? `<p class="text-xs text-red-700 mt-1">دلیل: ${request.rejectionReason}</p>` : ''}
                            </td>
                        </tr>`;
                    } else {
                        // This is the logic for original 'full' and 'empty' requests
                        return `
                        <tr class="border-b">
                            <td class="px-4 py-2">${formatDate(request.createdAt)}</td>
                            <td class="px-4 py-2">${request.greenhouseName}</td>
                            <td class="px-4 py-2">${request.driverName || '-'}</td>
                            <td class="px-4 py-2">${licensePlate}</td>
                            <td class="px-4 py-2">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'}</td>
                            <td class="px-4 py-2">${request.quantity}</td>
                            <td class="px-4 py-2">
                                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                            </td>
                        </tr>`;
                    }
                }
                if (reportType === 'driver') {
                     if (request.type === 'delivered_basket') {
                        return `
                        <tr class="border-b bg-indigo-50">
                            <td class="px-4 py-2">${formatDate(request.createdAt)}</td>
                            <td class="px-4 py-2">${request.sortingCenterName}</td>
                            <td class="px-4 py-2 font-semibold">تحویل به مرکز</td>
                            <td class="px-4 py-2">${request.quantity}</td>
                            <td class="px-4 py-2">
                                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                            </td>
                        </tr>`;
                    } else {
                        return `
                        <tr class="border-b">
                            <td class="px-4 py-2">${formatDate(request.createdAt)}</td>
                            <td class="px-4 py-2">${request.greenhouseName}</td>
                            <td class="px-4 py-2">${request.type === 'empty' ? 'سبد خالی' : 'سبد پر'}</td>
                            <td class="px-4 py-2">${request.quantity}</td>
                            <td class="px-4 py-2">
                                <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(request.status)}">
                                    ${getStatusText(request.status)}
                                </span>
                            </td>
                        </tr>`;
                    }
                }
            }).join('');
        }

        function filterAndLoadReports(reportType) {
            let filteredRequests;
            let startDateFilterId, endDateFilterId, nameFilterId, typeFilterId, basketTypeFilterId;

            switch(reportType) {
                case 'greenhouse':
                    startDateFilterId = 'greenhouse-start-date-filter';
                    endDateFilterId = 'greenhouse-end-date-filter';
                    basketTypeFilterId = 'greenhouse-basket-type-filter';
                    filteredRequests = requests.filter(r => r.greenhouseId === currentUser.id);
                    break;
                case 'sorting':
                    startDateFilterId = 'sorting-start-date-filter';
                    endDateFilterId = 'sorting-end-date-filter';
                    nameFilterId = 'sorting-filter-name';
                    typeFilterId = 'sorting-filter-type';
                    basketTypeFilterId = 'sorting-basket-type-filter';
                    filteredRequests = requests.filter(r => r.sortingCenterId === currentUser.id);
                    break;
                case 'driver':
                    startDateFilterId = 'driver-start-date-filter';
                    endDateFilterId = 'driver-end-date-filter';
                    basketTypeFilterId = 'driver-basket-type-filter';
                    filteredRequests = requests.filter(r => r.driverId === currentUser.id);
                    break;
                default:
                    return;
            }

            const startDateValue = document.getElementById(startDateFilterId).value;
            const endDateValue = document.getElementById(endDateFilterId).value;

            if (startDateValue && endDateValue) {
                const startDate = new Date(startDateValue);
                startDate.setUTCHours(0, 0, 0, 0);
                
                const endDate = new Date(endDateValue);
                endDate.setUTCHours(23, 59, 59, 999);

                if (startDate > endDate) {
                    showToast('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد', 'error');
                    loadReports(reportType, []); // Clear report if dates are invalid
                    return;
                }

                filteredRequests = filteredRequests.filter(r => {
                    const requestDate = new Date(r.createdAt);
                    return requestDate >= startDate && requestDate <= endDate;
                });
            }

            if (basketTypeFilterId) {
                const basketType = document.getElementById(basketTypeFilterId).value;
                if (basketType !== 'all') {
                    filteredRequests = filteredRequests.filter(r => r.type === basketType);
                }
            }

            if (reportType === 'sorting') {
                const filterName = document.getElementById(nameFilterId).value.trim().toLowerCase();
                const filterType = document.getElementById(typeFilterId).value;

                if (filterName) {
                    if (filterType === 'greenhouse') {
                        filteredRequests = filteredRequests.filter(r => r.greenhouseName.toLowerCase().includes(filterName));
                    } else if (filterType === 'driver') {
                        filteredRequests = filteredRequests.filter(r => r.driverName && r.driverName.toLowerCase().includes(filterName));
                    } else {
                         filteredRequests = filteredRequests.filter(r => 
                            (r.greenhouseName && r.greenhouseName.toLowerCase().includes(filterName)) ||
                            (r.driverName && r.driverName.toLowerCase().includes(filterName))
                        );
                    }
                }
            }

            loadReports(reportType, filteredRequests);
        }

        function filterGreenhouseReports() { filterAndLoadReports('greenhouse'); }
        function filterSortingReports() { filterAndLoadReports('sorting'); }
        function filterDriverReports() { filterAndLoadReports('driver'); }
        function filterFarmerReports() {
            let filteredAds = supplyAds.filter(ad => ad.sellerId === currentUser.id);

            const startDateValue = document.getElementById('farmer-start-date-filter').value;
            const endDateValue = document.getElementById('farmer-end-date-filter').value;

            if (startDateValue && endDateValue) {
                const startDate = new Date(startDateValue);
                startDate.setUTCHours(0, 0, 0, 0);
                
                const endDate = new Date(endDateValue);
                endDate.setUTCHours(23, 59, 59, 999);

                if (startDate > endDate) {
                    showToast('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد', 'error');
                    loadFarmerAdsReport([]);
                    return;
                }

                filteredAds = filteredAds.filter(ad => {
                    const adDate = new Date(ad.createdAt || 0);
                    return adDate >= startDate && adDate <= endDate;
                });
            }

            loadFarmerAdsReport(filteredAds);
        }

        function loadFarmerAdsReport(data) {
            const tbody = document.getElementById('farmer-reports-body');
            if (!tbody) return;
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">هیچ آگهی در این بازه زمانی ثبت نشده است.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(ad => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-2">${ad.date}</td>
                    <td class="px-4 py-2">${ad.product}</td>
                    <td class="px-4 py-2">${ad.quantity.toLocaleString('fa-IR')}</td>
                    <td class="px-4 py-2">${ad.price.toLocaleString('fa-IR')}</td>
                </tr>
            `).join('');
        }
        
        function filterBuyerReports() {
            let filteredAds = demandAds.filter(ad => ad.buyerId === currentUser.id);

            const startDateValue = document.getElementById('buyer-start-date-filter').value;
            const endDateValue = document.getElementById('buyer-end-date-filter').value;

            if (startDateValue && endDateValue) {
                const startDate = new Date(startDateValue);
                startDate.setUTCHours(0, 0, 0, 0);
                
                const endDate = new Date(endDateValue);
                endDate.setUTCHours(23, 59, 59, 999);

                if (startDate > endDate) {
                    showToast('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد', 'error');
                    loadBuyerReports([]);
                    return;
                }

                filteredAds = filteredAds.filter(ad => {
                    const adDate = new Date(ad.createdAt || 0);
                    return adDate >= startDate && adDate <= endDate;
                });
            }

            loadBuyerReports(filteredAds);
        }

        function loadBuyerReports(data) {
            const tbody = document.getElementById('buyer-reports-body');
            if (!tbody) return;
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">هیچ آگهی در این بازه زمانی ثبت نشده است.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(ad => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-2">${ad.date}</td>
                    <td class="px-4 py-2">${ad.product}</td>
                    <td class="px-4 py-2">${ad.quantity.toLocaleString('fa-IR')}</td>
                    <td class="px-4 py-2">${ad.price.toLocaleString('fa-IR')}</td>
                </tr>
            `).join('');
        }


        function downloadReport(reportType) {
            const tbodyId = `${reportType}-reports-body`;
            const headerIds = {
                'greenhouse': ['تاریخ', 'نوع', 'تعداد', 'راننده', 'پلاک', 'وضعیت'],
                'sorting': ['تاریخ', 'گلخانه', 'راننده', 'پلاک', 'نوع', 'تعداد', 'وضعیت'],
                'driver': ['تاریخ', 'گلخانه', 'نوع', 'تعداد', 'وضعیت']
            };

            const tbody = document.getElementById(tbodyId);
            const rows = Array.from(tbody.querySelectorAll('tr'));
            
            if (rows.length === 0 || (rows.length === 1 && rows[0].textContent.includes("گزارشی وجود ندارد"))) {
                showToast('داده‌ای برای دانلود وجود ندارد', 'info');
                return;
            }

            const headers = headerIds[reportType];
            const data = rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.map(cell => `"${cell.textContent.trim()}"`);
            });

            let csvContent = [
                headers.join(','),
                ...data.map(row => row.join(','))
            ].join('\n');
            
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${reportType}_report_${currentUser.username}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }

        function downloadGreenhouseReport() { downloadReport('greenhouse'); }
        function downloadSortingReport() { downloadReport('sorting'); }
        function downloadDriverReport() { downloadReport('driver'); }

        function downloadReportAsPDF(reportType) {
            const { jsPDF } = window.jspdf;
            const reportContainerId = `${reportType}-reports`;
            const originalElement = document.getElementById(reportContainerId);

            if (!originalElement || !originalElement.querySelector('tbody tr') || originalElement.querySelector('tbody tr td[colspan]')) {
                showToast('داده‌ای برای دانلود به صورت PDF وجود ندارد', 'info');
                return;
            }
            
            const printContainer = document.createElement('div');
            document.body.appendChild(printContainer);
            const clone = originalElement.cloneNode(true);
            printContainer.style.position = 'absolute';
            printContainer.style.left = '-9999px';
            printContainer.style.top = '0px';
            printContainer.style.zIndex = '9999';
            printContainer.style.backgroundColor = 'white';
            printContainer.style.width = '1000px'; 
            clone.style.maxHeight = 'none';
            clone.style.overflow = 'visible';
            printContainer.appendChild(clone);
            
            html2canvas(printContainer, { scale: 2, useCORS: true }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                
                const today = new Date().toISOString().split('T')[0];
                const filename = `${reportType}_report_${today}.pdf`;
                pdf.save(filename);

                document.body.removeChild(printContainer);
            });
        }


        // Notification Functions
        function updateNotificationBadge() {
            const unreadCount = notifications.filter(n => 
                n.userId === currentUser.id && !n.read
            ).length;
            
            const badge = document.getElementById('notification-badge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        async function showNotifications() {
            // This function now aggregates notifications from their source, just like the bell counter.
            if (!currentUser) return;

            const displayableNotifications = [];
            const role = currentUser.role;

            // 1. Aggregate Unread Messages
            const unreadMessages = messages.filter(m => m.recipientId === currentUser.id && !m.read);
            unreadMessages.forEach(msg => {
                displayableNotifications.push({
                    id: `msg-${msg.id}`,
                    message: `پیام جدید از ${msg.senderName}`,
                    createdAt: msg.createdAt,
                    type: 'message'
                });
            });

            // 2. Aggregate Role-specific notifications
            if (role === 'sorting') {
                // Pending transport requests
                const pendingRequests = requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'pending');
                pendingRequests.forEach(req => {
                    displayableNotifications.push({
                        id: `req-${req.id}`,
                        message: `درخواست جدید از ${req.greenhouseName} برای ${req.quantity} سبد`,
                        createdAt: req.createdAt,
                        type: 'request'
                    });
                });

                // Pending connection requests
                const pendingConnections = connections.filter(c => c.targetId === currentUser.id && c.status === 'pending');
                pendingConnections.forEach(conn => {
                    displayableNotifications.push({
                        id: `conn-${conn.id}`,
                        message: `درخواست اتصال جدید از ${conn.sourceName} (${getRoleTitle(conn.sourceRole)})`,
                        createdAt: conn.createdAt,
                        type: 'connection'
                    });
                });

                // Incoming deliveries
                const incomingDeliveries = requests.filter(r => r.sortingCenterId === currentUser.id && r.status === 'in_progress_to_sorting');
                incomingDeliveries.forEach(req => {
                    displayableNotifications.push({
                        id: `delivery-${req.id}`,
                        message: `راننده ${req.driverName} در حال تحویل بار است`,
                        createdAt: req.createdAt,
                        type: 'delivery'
                    });
                });

            } else if (role === 'driver') {
                // Pending assignments
                const pendingAssignments = requests.filter(r => r.driverId === currentUser.id && r.status === 'assigned');
                pendingAssignments.forEach(req => {
                    displayableNotifications.push({
                        id: `assign-${req.id}`,
                        message: `ماموریت جدید برای ${req.greenhouseName} به شما اختصاص داده شد`,
                        createdAt: req.createdAt,
                        type: 'assignment'
                    });
                });
            }

            // 3. Sort and Render
            displayableNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const container = document.getElementById('notifications-list');
            
            if (displayableNotifications.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">اعلانی وجود ندارد</p>';
            } else {
                container.innerHTML = displayableNotifications.map(notification => {
                    let icon = '';
                    switch(notification.type) {
                        case 'message': icon = 'fa-comment-dots'; break;
                        case 'request': icon = 'fa-truck'; break;
                        case 'connection': icon = 'fa-user-friends'; break;
                        case 'delivery': icon = 'fa-dolly'; break;
                        case 'assignment': icon = 'fa-clipboard-list'; break;
                        default: icon = 'fa-bell';
                    }
                    return `
                        <div class="p-3 border-b border-gray-200 flex items-start">
                            <i class="fas ${icon} text-blue-500 w-6 text-center mt-1"></i>
                            <div class="flex-1 mr-3">
                                <p class="text-sm text-gray-800">${notification.message}</p>
                                <p class="text-xs text-gray-500 mt-1">${formatDate(notification.createdAt)}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // The old logic for marking notifications as read is removed, as it was non-functional.
            // The bell will now update automatically as items are actioned.
            
            document.getElementById('notification-modal').classList.remove('hidden');
        }

        function closeNotifications() {
            document.getElementById('notification-modal').classList.add('hidden');
        }

        function updateDriverCapacityUI() {
            const emptyBasketsInput = document.getElementById('empty-baskets-count');
            const loadCapacityInput = document.getElementById('load-capacity');

            if (!emptyBasketsInput || !loadCapacityInput) return;

            const emptyBasketsValue = parseInt(emptyBasketsInput.value) || 0;
            const loadCapacityValue = parseInt(loadCapacityInput.value) || 0;

            if (emptyBasketsValue > 0) {
                loadCapacityInput.value = 0;
                loadCapacityInput.disabled = true;
                emptyBasketsInput.disabled = false;
            } else if (loadCapacityValue > 0) {
                emptyBasketsInput.value = 0;
                emptyBasketsInput.disabled = true;
                loadCapacityInput.disabled = false;
            } else {
                emptyBasketsInput.disabled = false;
                loadCapacityInput.disabled = false;
            }
        }

        function setupDriverCapacityRules() {
            const emptyBasketsInput = document.getElementById('empty-baskets-count');
            const loadCapacityInput = document.getElementById('load-capacity');

            if (emptyBasketsInput && loadCapacityInput) {
                emptyBasketsInput.addEventListener('input', updateDriverCapacityUI);
                loadCapacityInput.addEventListener('input', updateDriverCapacityUI);
                updateDriverCapacityUI();
            }
        }

        function handleAppDownload(event) {
            // We don't call event.preventDefault() because the default behavior
            // of an anchor tag pointing to a file is to download it, which is what we want.
            // This function's purpose is just to show a notification to the user.
            showToast('دانلود شروع شد...', 'info');
        }
        const CURRENT_APP_VERSION = '1.0.0';
        const LATEST_APP_VERSION = '1.1.0'; // Simulate an update is available

        function checkForAppUpdates() {
            // A simple version comparison. In a real app, this might involve a server call.
            if (LATEST_APP_VERSION > CURRENT_APP_VERSION) {
                // Update sidebar menu link
                const menuDownloadLink = document.getElementById('menu-download-app');
                if (menuDownloadLink && !menuDownloadLink.querySelector('.update-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'update-badge';
                    badge.textContent = 'جدید';
                    menuDownloadLink.appendChild(badge);
                }

                // Update download page buttons
                const androidBtn = document.getElementById('android-download-btn');
                const iosBtn = document.getElementById('ios-download-btn');

                const updateButton = (btn, platformName) => {
                    if (btn) {
                        btn.classList.add('update-glow');
                        const textDiv = btn.querySelector('div');
                        if (textDiv) {
                            textDiv.innerHTML = `
                                <p class="font-semibold">نسخه جدید آماده دانلود</p>
                                <p class="text-2xl font-bold">${platformName}</p>
                            `;
                        }
                    }
                };
                
                updateButton(androidBtn, 'اندروید');
                updateButton(iosBtn, 'آی‌او‌اس');
            }
        }
        // Utility Functions
        function getMarkerPopupContent(user, isDriverActive, isCurrentUser) {
            let roleText = getRoleTitle(user.role);
            if (isCurrentUser) {
                if (user.role === 'driver') {
                    roleText = 'راننده - موقعیت GPS';
                } else {
                    roleText += ' - موقعیت شما';
                }
            }

            return `
                <div style="text-align: center; min-width: 150px;">
                    <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                        ${user.fullname}
                    </div>
                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
                        ${roleText}
                    </div>
                    ${user.role === 'driver' ? `
                        <div style="font-weight: bold; font-size: 12px; color: #374151; margin-top: 4px; direction: ltr;">${user.licensePlate || ''}</div>
                        <div style="font-size: 11px; color: ${isDriverActive ? '#ef4444' : '#10b981'};">
                            ${isDriverActive ? '🔴 در ماموریت' : '🟢 آزاد'}
                        </div>
                        ${user.emptyBaskets > 0 ? `<div style="font-size: 10px; color: #3b82f6;">سبد خالی: ${user.emptyBaskets}</div>` : ''}
                        ${user.loadCapacity > 0 ? `<div style="font-size: 10px; color: #10b981;">ظرفیت: ${user.loadCapacity}</div>` : ''}
                    ` : ''}
                </div>
            `;
        }

        function getStatusClass(status) {
            const classes = {
                pending: 'bg-yellow-100 text-yellow-800',
                assigned: 'bg-blue-100 text-blue-800',
                in_progress: 'bg-green-100 text-green-800',
                in_progress_to_sorting: 'bg-indigo-100 text-indigo-800',
                picked_up: 'bg-purple-100 text-purple-800',
                completed: 'bg-gray-100 text-gray-800',
                rejected: 'bg-red-100 text-red-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        }

        function getStatusText(status) {
            const texts = {
                pending: 'در انتظار',
                assigned: 'اختصاص داده شده',
                in_progress: 'در حال انجام',
                in_progress_to_sorting: 'در راه سورتینگ',
                delivering: 'در حال تحویل',
                picking_up: 'در حال بارگیری',
                picked_up: 'بارگیری شده',
                completed: 'تکمیل شده',
                rejected: 'رد شده'
            };
            return texts[status] || status;
        }

        function getUser(userId) {
            return users.find(u => u.id === userId);
        }

        function getUserPhone(userId) {
            const user = getUser(userId);
            return user ? user.phone : '-';
        }


        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toast-message');
            
            toastMessage.textContent = message;
            
            toast.className = `fixed top-4 left-4 px-6 py-3 rounded-lg shadow-lg notification-slide z-[10002] ${
                type === 'error' ? 'bg-red-500' : 
                type === 'info' ? 'bg-blue-500' : 'bg-green-500'
            } text-white`;
            
            toast.classList.remove('hidden');
            
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }

        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');

            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);

            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }

        async function subscribeToPushNotifications() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Push notifications are not supported by this browser.');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (subscription || Notification.permission !== 'default') {
                // User is already subscribed or has already chosen to allow/deny.
                // No need to show the custom modal.
                return;
            }

            const subscribeUser = async () => {
                try {
                    // IMPORTANT: This is a placeholder VAPID public key.
                    // You must generate your own key pair on your server and replace this value.
                    const vapidPublicKey = 'BNo_gideD51dMHezXPl30kAP89i16f1fqdG2hB_L5T6sT4aM7L2K2F8p1aJ_r-A-1y8a-z-H8B_y_Z-E8D9F6wY';
                    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    });

                    console.log('%c[Push Subscription] SUBSCRIBED:', 'color: green; font-weight: bold;', subscription);
                    console.log('%cTODO: Send this subscription object to your server to save against the user ID.', 'color: orange; font-weight: bold;');
                
                } catch (error) {
                    console.error('Failed to subscribe to push notifications:', error);
                    if (Notification.permission === 'denied') {
                        showToast('شما دسترسی به اعلان‌ها را مسدود کرده‌اید. لطفاً در تنظیمات مرورگر آن را فعال کنید.', 'error');
                    }
                }
            };
            
            showPermissionModal({
                icon: '<i class="fas fa-bell text-blue-500"></i>',
                title: 'فعال‌سازی اعلان‌ها',
                body: 'برای اطلاع‌رسانی از ماموریت‌ها و پیام‌های جدید، لطفاً اجازه ارسال اعلان را به ما بدهید. ما مزاحم شما نخواهیم شد.',
                onAgree: subscribeUser
            });
        }

        function showDisclaimerModal() {
            const modal = document.getElementById('disclaimer-modal');
            const roleTextElement = document.getElementById('disclaimer-modal-role-text');
            const agreeBtn = document.getElementById('disclaimer-modal-agree-btn');

            const roleTexts = {
                greenhouse: 'شما به عنوان گلخانه‌دار، می‌توانید مستقیماً با مراکز سورتینگ و رانندگان در ارتباط باشید، درخواست‌های حمل و نقل ثبت کنید و محصولات خود را در بازار بزرگ سودسیتی عرضه کنید.',
                farmer: 'شما به عنوان کشاورز، می‌توانید محصولات خود را بدون واسطه در بازار عرضه کرده و با خریداران از سراسر کشور در ارتباط باشید.',
                sorting: 'شما به عنوان مرکز سورتینگ، می‌توانید با گلخانه‌داران و رانندگان متعدد همکاری کنید، درخواست‌های حمل و نقل را مدیریت کرده و محصولات دستچین شده را به خریداران عرضه نمایید.',
                buyer: 'شما به عنوان خریدار، به بازاری بزرگ از محصولات کشاورزی تازه و باکیفیت دسترسی دارید و می‌توانید مستقیماً با تولیدکنندگان و مراکز سورتینگ ارتباط برقرار کنید.',
                driver: 'شما به عنوان راننده، می‌توانید ماموریت‌های حمل و نقل متنوعی را از مراکز سورتینگ دریافت کرده، مسیر خود را بهینه کنید و درآمد خود را افزایش دهید.'
            };

            const userRole = currentUser ? currentUser.role : '';
            roleTextElement.textContent = roleTexts[userRole] || 'به پلتفرم هوشمند کشاورزی سودسیتی خوش آمدید.';

            const hideModal = () => {
                modal.classList.remove('visible');
                sessionStorage.setItem('disclaimer_shown_this_session', 'true');
            };

            agreeBtn.onclick = hideModal;

            modal.classList.add('visible');
        }

        function showPermissionModal({ icon, title, body, onAgree, onDisagree }) {
            const modal = document.getElementById('permission-modal');
            const modalContent = document.getElementById('permission-modal-content');
            const modalIcon = document.getElementById('permission-modal-icon');
            const modalTitle = document.getElementById('permission-modal-title');
            const modalBody = document.getElementById('permission-modal-body');
            const agreeBtn = document.getElementById('permission-modal-agree-btn');
            const disagreeBtn = document.getElementById('permission-modal-disagree-btn');

            modalIcon.innerHTML = icon;
            modalTitle.textContent = title;
            modalBody.textContent = body;

            const hideModal = () => modal.classList.remove('visible');

            const agreeHandler = () => {
                hideModal();
                if (onAgree) onAgree();
            };

            const disagreeHandler = () => {
                hideModal();
                if (onDisagree) onDisagree();
            };
            
            agreeBtn.onclick = agreeHandler;
            disagreeBtn.onclick = disagreeHandler;

            modal.classList.add('visible');
        }

        function showBackgroundNotification(title, body) {
            // Only show notifications if the page is hidden
            if (!document.hidden) {
                return;
            }

            const playSound = () => {
                notificationSound.currentTime = 0; // Rewind to the start
                notificationSound.play().catch(error => console.error("Error playing notification sound:", error));
            };

            // Check if the browser supports notifications
            if (!("Notification" in window)) {
                console.log("This browser does not support desktop notification");
            } 
            // Check if permission is already granted
            else if (Notification.permission === "granted") {
                new Notification(title, { body: body, icon: 'soodcity.jpg' });
                playSound();
            } 
            // Otherwise, we need to ask the user for permission
            else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(function (permission) {
                    // If the user accepts, let's create a notification
                    if (permission === "granted") {
                        new Notification(title, { body: body, icon: 'soodcity.jpg' });
                        playSound();
                    }
                });
            }
        }

        function cleanupOldNotifications() {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const originalCount = notifications.length;
            notifications = notifications.filter(n => n.createdAt >= twentyFourHoursAgo);
            if (notifications.length < originalCount) {
                localStorage.setItem('agritrack_notifications', JSON.stringify(notifications));
            }
        }

        function refreshActiveChats() {
            for (const conversationId in activeChats) {
                if (Object.hasOwnProperty.call(activeChats, conversationId)) {
                    const chat = activeChats[conversationId];
                    loadChatMessages(conversationId, chat.recipientId);
                }
            }
        }

        function refreshDataPeriodically() {
            if (isNavigating) return; // Halt refresh during any navigation

            if (currentUser && !isFormActive) { // Do not refresh if a form element is active
                loadDataFromServer(); // Load latest data from storage
                checkForNewNotifications(); // Check for new items and trigger notifications
                loadPanelData();
                refreshAllMapMarkers(); // Refresh map markers for all users
                updateAllNotifications();
                refreshActiveChats();

                // After all UI is updated, take a new snapshot for the next cycle.
                updateDataSnapshot();
            }
        }
        
        setInterval(refreshDataPeriodically, 5000); // 5 seconds
        setInterval(cleanupOldNotifications, 60 * 60 * 1000); // Every hour


        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Page is now visible. Checking for location updates.');
                // When the user returns to the page, get the latest location from storage
                const lastPosition = JSON.parse(localStorage.getItem('last_known_position'));
                if (currentUser && currentUser.role === 'driver' && lastPosition) {
                     updateDriverLocationOnMap(lastPosition);
                     const lastTimestamp = localStorage.getItem('last_known_position_timestamp');
                     if (lastTimestamp) {
                         updateLastUpdateTime(new Date(lastTimestamp));
                     }
                }
            }
        });

        function updateDriverLocationOnMap(location) {
            // This function updates the driver's marker on the main map.
            if (driverMainMap && driverMainMap.userMarkers && currentUser && driverMainMap.userMarkers[currentUser.id]) {
                const marker = driverMainMap.userMarkers[currentUser.id];
                const newLatLng = L.latLng(location.lat, location.lng);
                marker.setLatLng(newLatLng);
            }
        }

        // --- Real-Time Syncing via Storage Event ---
        window.addEventListener('storage', async (event) => {
            // Don't process storage events if user isn't logged in, or a form is being used.
            if (!currentUser || isFormActive) {
                return;
            }

            try {
                // When any key changes that affects the UI, reload all data from storage
                // and then re-render the entire panel. This is a simple but effective way
                // to ensure all tabs stay in sync.
                if (event.key.startsWith('agritrack_')) {
                     console.log(`Storage event for ${event.key} detected. Reloading data and refreshing UI.`);
                    await loadDataFromServer();
                    loadPanelData();
                    updateAllNotifications(); // Also refresh notification badges
                    refreshActiveChats();
                }
            } catch (e) {
                console.error('Error processing storage event:', e);
            }
        });
        // New Landing Page Background Animation
        const canvas = document.createElement('canvas');
        const container = document.getElementById('landing-bg-animation');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        let particles = [];
        const particleCount = 50;

        function resizeCanvas() {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
                this.color = `rgba(0, 255, 255, ${Math.random() * 0.5 + 0.2})`;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.size > 0.2) this.size -= 0.01;
            }
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function handleParticles() {
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0, 255, 255, ${1 - distance/100})`;
                        ctx.lineWidth = 0.2;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                if (particles[i].size <= 0.2) {
                    particles.splice(i, 1);
                    i--;
                }
            }
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            handleParticles();
            requestAnimationFrame(animate);
        }

        function init() {
            resizeCanvas();
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
            animate();
        }

        window.addEventListener('resize', function() {
            resizeCanvas();
            particles = [];
             for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        });

        init();

        async function confirmSortingDelivery(deliveryRequestId) {
            const response = await api.updateRequest(deliveryRequestId, {
                status: 'completed',
                completedAt: new Date().toISOString()
            });

            if (response.success) {
                showToast('تحویل با موفقیت تایید شد.', 'success');
                
                await loadDataFromServer();
                refreshAllMapMarkers();
                loadIncomingDeliveries();
                filterSortingReports();
            } else {
                showToast(response.message || 'خطا در تایید تحویل.', 'error');
            }
        }

        async function cancelSortingDelivery(deliveryRequestId) {
            openRejectionModal(deliveryRequestId);
        }

        let currentRejectionRequestId = null;

        function openRejectionModal(deliveryRequestId) {
            currentRejectionRequestId = deliveryRequestId;
            document.getElementById('rejection-reason-modal').classList.remove('hidden');
            document.getElementById('rejection-reason-modal').classList.add('flex');
        }

        function closeRejectionModal() {
            currentRejectionRequestId = null;
            document.getElementById('rejection-reason-modal').classList.add('hidden');
            document.getElementById('rejection-reason-modal').classList.remove('flex');
            document.getElementById('rejection-reason-textarea').value = '';
        }

        async function submitRejection() {
            const reason = document.getElementById('rejection-reason-textarea').value;
            if (!reason.trim()) {
                showToast('لطفاً دلیل عدم تایید را وارد کنید.', 'error');
                return;
            }

            if (currentRejectionRequestId) {
                const response = await api.rejectConsolidatedDelivery(currentRejectionRequestId, reason);
                
                if (response.success) {
                    showToast('تحویل رد شد و ماموریت‌های اصلی به حالت قبل بازگشتند.', 'info');
                    
                    await loadDataFromServer();
                    refreshAllMapMarkers();
                    loadIncomingDeliveries();
                    filterSortingReports();
                } else {
                    showToast(response.message || 'خطا در رد کردن تحویل.', 'error');
                }
            }
            closeRejectionModal();
        }

        // --- Service Worker Registration and Communication ---
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered successfully:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });

            // Listen for messages from the service worker
            navigator.serviceWorker.onmessage = event => {
                if (event.data && event.data.type === 'location-update') {
                    const { location, timestamp } = event.data;
                    
                    // This logic runs regardless of who is currently logged in.
                    const driverIndex = users.findIndex(u => u.role === 'driver');

                    if (driverIndex !== -1) {
                        users[driverIndex].location = location;
                        
                        // If the currently logged-in user happens to be the driver,
                        // update their live object as well for immediate UI consistency.
                        if (currentUser && currentUser.id === users[driverIndex].id) {
                            currentUser.location = location;
                        }

                        // Save the updated users array back to storage. This is the source of truth for all maps.
                        localStorage.setItem('agritrack_users', JSON.stringify(users));
                        
                        // We will rely on the storage event listener for cross-tab updates,
                        // but for the current tab, we can refresh immediately.
                        if (document.visibilityState === 'visible') {
                            refreshAllMapMarkers();
                        }
                    }
                }
            };
        }