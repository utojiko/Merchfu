document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        fetch('./data/items.json').then(response => response.json()),
        fetch('./data/itemTypes.json').then(response => response.json())
    ])
        .then(([itemsData, itemTypesData]) => {
            // listItems(itemsData);
            const ITEMS_PER_LOAD = 500;
            let currentItemIndex = 0;
            let allItems = []; // Stocke tous les items pour le tri
            let filteredItems = []; // Items après filtrage par recherche
            let isSearchActive = false;

            const prepareItemsData = () => {
                return Object.keys(itemsData).map(key => {
                    const item = itemsData[key];
                    const priceKeys = Object.keys(item.price || {});

                    // Vérifier si l'item a des prix
                    if (!priceKeys.length) return null;

                    const lastPriceKey = priceKeys[priceKeys.length - 1];
                    const lastPrice = item.price[lastPriceKey].value;
                    const lastPriceDate = item.price[lastPriceKey].date;

                    // Calcul de la moyenne des prix
                    let moyenne_prix = 0;
                    priceKeys.forEach(element => {
                        moyenne_prix += parseInt(item.price[element].value);
                    });
                    moyenne_prix = parseInt(moyenne_prix / priceKeys.length);

                    // Calcul de la progression basée sur les 3 derniers prix
                    const lastThreePriceKeys = priceKeys.slice(-3);
                    const lastThreePrices = lastThreePriceKeys.map(key => item.price[key].value);
                    const moyenne_3_derniers = lastThreePrices.reduce((sum, value) => sum + parseInt(value), 0) / lastThreePrices.length;
                    const pourcentage = Math.round((lastPrice - moyenne_3_derniers) * 100 / moyenne_3_derniers);

                    return {
                        id: key,
                        type: item.type || "unknown",
                        info: item.info,
                        lastPrice,
                        lastPriceDate,
                        moyenne_prix,
                        pourcentage
                    };
                }).filter(item => item !== null); // Éliminer les items sans prix
            };

            allItems = prepareItemsData();
            filteredItems = [...allItems];

            const tableBody = document.getElementById('tbody-data-items');
            const itemCountSpan = document.getElementById('totalItems');

            // Fonction pour rendre un item dans le tableau
            const renderItem = (itemData) => {
                const row = document.createElement('tr');
                row.id = itemData.id;
                row.classList.add('item-row');

                let nom = itemData.id;
                if (itemData.info) {
                    let rarityIcon = {
                        "mythique": " <img src=\"https://vertylo.github.io/wakassets/rarities/3.png\" class=\"icon-rarities\">",
                        "légendaire": " <img src=\"https://vertylo.github.io/wakassets/rarities/4.png\" class=\"icon-rarities\">",
                        "souvenir": " <img src=\"https://vertylo.github.io/wakassets/rarities/6.png\" class=\"icon-rarities\">",
                        "nouvelle": " <img src=\"https://vertylo.github.io/wakassets/rarities/1.png\" class=\"icon-rarities\">",
                        "ancienne": " <img src=\"https://vertylo.github.io/wakassets/rarities/0.png\" class=\"icon-rarities\">",
                        "+3 lv": " (+3 lv)",
                        "lv 50": " (lv 50)",
                    };
                    nom = itemData.id.trim() + rarityIcon[itemData.info];
                }

                const lastPriceDateDiff = dateDiffInDays(itemData.lastPriceDate);
                const symbole = itemData.pourcentage >= 0 ? '+' : '-';
                const pourcentageFormatte = `${symbole}${Math.abs(itemData.pourcentage).toFixed(0).toLocaleString('fr-FR')}`;

                let className = "";
                if (itemData.pourcentage > 0) {
                    className = "augmentationPrix";
                }
                if (itemData.pourcentage < 0) {
                    className = "diminutionPrix";
                }

                const typeInfo = itemTypesData[itemData.type] || { name: "unknown", img: "" };

                row.innerHTML = `
                <td id="${typeInfo.name}">
                    <img src="${typeInfo.img}" class="non-selectable" />
                </td>
                <td>${nom}</td>
                <td>${itemData.lastPrice.toLocaleString('fr-FR')} </td>
                <td>${lastPriceDateDiff}</td>
                <td>${itemData.moyenne_prix.toLocaleString('fr-FR')}</td>
                <td class="${className} progression">${pourcentageFormatte}%</td>
            `;

                return row;
            };
            // Fonction pour calculer la différence en jours
            const dateDiffInDays = (dateString) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
                let sRet = `${diffDays} jour`;
                return diffDays > 1 ? sRet + "s" : sRet + "";
            };

            // Fonction pour charger plus d'items
            const loadMoreItems = () => {
                const itemsToRender = isSearchActive ? filteredItems : allItems;
                const endIndex = Math.min(currentItemIndex + ITEMS_PER_LOAD, itemsToRender.length);

                for (let i = currentItemIndex; i < endIndex; i++) {
                    const row = renderItem(itemsToRender[i]);
                    tableBody.appendChild(row);
                }

                currentItemIndex = endIndex;

                // Mettre à jour le compteur d'items
                const totalItems = itemsToRender.length;
                itemCountSpan.textContent = `${Math.min(currentItemIndex, totalItems)}/${totalItems}`;

                // Ajouter l'écouteur de clic aux nouvelles cellules
                attachClickListenersToNewRows();
            };

            // Fonction pour réinitialiser l'affichage du tableau
            const resetTable = () => {
                tableBody.innerHTML = '';
                currentItemIndex = 0;
            };

            // Fonction pour trier les items
            const sortItems = (column, order) => {
                const itemsToSort = isSearchActive ? filteredItems : allItems;

                itemsToSort.sort((a, b) => {
                    let aValue, bValue;

                    switch (column) {
                        case 'type':
                            aValue = (itemTypesData[a.type] || {}).name || "";
                            bValue = (itemTypesData[b.type] || {}).name || "";
                            break;
                        case 'name':
                            aValue = a.id;
                            bValue = b.id;
                            break;
                        case 'lastPrice':
                            aValue = a.lastPrice;
                            bValue = b.lastPrice;
                            break;
                        case 'lastPriceDate':
                            aValue = new Date(a.lastPriceDate).getTime();
                            bValue = new Date(b.lastPriceDate).getTime();
                            break;
                        case 'averagePrice':
                            aValue = a.moyenne_prix;
                            bValue = b.moyenne_prix;
                            break;
                        case 'progression':
                            aValue = a.pourcentage;
                            bValue = b.pourcentage;
                            break;
                        default:
                            aValue = a.id;
                            bValue = b.id;
                    }

                    if (typeof aValue === 'string' && typeof bValue === 'string') {
                        return order * aValue.localeCompare(bValue);
                    } else {
                        return order * (aValue - bValue);
                    }
                });

                // Réinitialiser l'affichage et recharger
                resetTable();
                loadMoreItems();
            };

            // Fonction pour filtrer les items par recherche
            const filterItems = (searchTerms) => {
                if (searchTerms.length === 0 || (searchTerms.length === 1 && searchTerms[0] === '')) {
                    filteredItems = [...allItems];
                    isSearchActive = false;
                } else {
                    filteredItems = allItems.filter(item => {
                        let matches = false;

                        searchTerms.forEach(searchTerm => {
                            searchTerm = searchTerm.trim();
                            if (searchTerm === "$") return;

                            if (searchTerm.startsWith("$")) {
                                const typeInfo = itemTypesData[item.type] || { name: "" };
                                const itemTypeId = typeInfo.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                                if (itemTypeId.includes(searchTerm.slice(1))) {
                                    matches = true;
                                }
                            } else {
                                const itemId = item.id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                                if (itemId.includes(searchTerm)) {
                                    matches = true;
                                }
                            }
                        });

                        return matches;
                    });

                    isSearchActive = true;
                }

                resetTable();
                loadMoreItems();
            };



            const priceChartCanvas = document.getElementById('priceChart');
            let priceChart;

            // Attacher les écouteurs de clic aux nouvelles lignes
            const attachClickListenersToNewRows = () => {
                document.querySelectorAll('#tbody-data-items tr.item-row td:not(:nth-child(2))').forEach(cell => {
                    if (!cell.hasAttribute('data-event-attached')) {
                        cell.setAttribute('data-event-attached', 'true');
                        cell.addEventListener('click', handleCellClick);
                    }
                });
            };

            // Fonction de gestionnaire de clic
            const handleCellClick = (event) => {
                const cell = event.currentTarget;
                const infoItemContainer = document.querySelector('.info-item-container');
                const infoItemTbody = document.querySelector('#tbody-info-items');
                const titleInfo = document.getElementById('title-info');

                // Rendre visible le composant
                infoItemContainer.style.visibility = 'visible';

                // Obtenir les informations de la ligne parente de la cellule cliquée
                const row = cell.parentElement;
                const cells = row.querySelectorAll('td');
                const nomItemClic = cells[1].textContent;

                const prixClic = cells[2].textContent;
                infoItemTbody.innerHTML = "";
                titleInfo.textContent = nomItemClic;
                const dates = [];
                const values = [];
                let minPrice = Number.MAX_SAFE_INTEGER;
                let maxPrice = Number.MIN_SAFE_INTEGER;
                let sumPrice = 0;

                // Première boucle pour calculer minPrice, maxPrice et sumPrice
                Object.values(itemsData[row.id].price).forEach((item) => {
                    if (minPrice > item.value) {
                        minPrice = item.value;
                    }
                    if (maxPrice < item.value) {
                        maxPrice = item.value;
                    }
                    sumPrice += item.value;
                });

                Object.values(itemsData[row.id].price).forEach((item, index) => {
                    const formattedValue = item.value.toLocaleString('fr-FR');
                    const formattedItemDate = formatDate(item.date);
                    dates.push(item.date);
                    values.push(item.value);
                    let priceClass = '';
                    if (item.value === minPrice) {
                        priceClass = 'lowest-price';
                    } else if (item.value === maxPrice) {
                        priceClass = 'highest-price';
                    }
                    infoItemTbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formattedItemDate}</td>
                            <td class="${priceClass}">${formattedValue}</td>
                        </tr>
                    `;
                });

                infoItemTbody.innerHTML += `
                
                <tr><td></td></tr>
                <tr>
                    <td></td>
                    <td class="moyenne-details">Moyenne</td>
                    <td>${Math.floor(sumPrice / Object.keys(itemsData[row.id].price).length).toLocaleString('fr-FR')}</td>
                </tr/>
                `;
                // Mise à jour du graphique
                if (priceChart) {
                    priceChart.destroy(); // Détruire le graphique précédent s'il existe
                }
                priceChart = new Chart(priceChartCanvas, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Prix',
                            data: values,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'day',
                                    tooltipFormat: 'yyyy-MM-dd',
                                    displayFormats: {
                                        day: 'dd MMM yyyy'
                                    }
                                },
                                grid: {
                                    color: 'rgba(128, 128, 128, 0.2)'
                                },
                                title: {
                                    display: true,
                                    text: 'Date'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Prix'
                                },
                                grid: {
                                    color: 'rgba(128, 128, 128, 0.2)'
                                }
                            }
                        }
                    }
                });
            };

            // Initialiser le tableau avec les 500 premiers items
            loadMoreItems();

            // Attacher l'écouteur pour détecter le scroll jusqu'en bas
            window.addEventListener('scroll', () => {
                if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                    // L'utilisateur est près du bas de la page
                    if (currentItemIndex < (isSearchActive ? filteredItems.length : allItems.length)) {
                        loadMoreItems();
                    }
                }
            });

            // Configurer les écouteurs de tri d'en-tête
            document.querySelectorAll('#thead-data-items th').forEach(th => {
                th.addEventListener('click', () => {
                    const column = th.getAttribute('data-column');
                    if (!column) return;

                    const order = th.dataset.order = -(th.dataset.order || -1);

                    // Retirer les classes de tri des autres en-têtes
                    document.querySelectorAll('#thead-data-items th').forEach(header => {
                        if (header !== th) {
                            header.classList.remove('sorted-asc', 'sorted-desc');
                            header.removeAttribute('data-order');
                        }
                    });

                    // Ajouter la classe de tri à l'en-tête cliqué
                    th.classList.add(order === 1 ? 'sorted-asc' : 'sorted-desc');

                    // Trier les données et rafraîchir l'affichage
                    sortItems(column, order);
                });
            });

            // Configurer la recherche
            const searchInput = document.getElementById('searchInput');
            let searchTimeout;

            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerms = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('&');
                    filterItems(searchTerms);
                }, 600);
            });

            // Bouton pour effacer la recherche
            const btnCroixRecherche = document.getElementById('btn-onglet-recherche-croix');
            btnCroixRecherche.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            });

            // Gestion de la fermeture des fenêtres d'information
            const closeButton = document.querySelector('.close');
            closeButton.addEventListener('click', () => {
                closeButton.parentElement.style.visibility = 'hidden';
            });

            // Code pour les touches de raccourci
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" || event.keyCode === 27) {
                    document.getElementById('intro-container').style.display = 'none';
                    document.querySelector('.info-item-container').style.visibility = 'hidden';
                }

                if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                    event.preventDefault();
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }
            });

            // Code pour l'écran d'information des types d'objets
            const infoBtn = document.getElementById('info-btn');
            const introContainer = document.getElementById('intro-container');
            const closeIntro = document.getElementById('close-intro');

            infoBtn.addEventListener('click', () => {
                introContainer.style.display = 'block';
            });

            closeIntro.addEventListener('click', () => {
                introContainer.style.display = 'none';
            });

            // Générer le tableau des types d'objets
            const tableInfoTypes = document.getElementById("info-types-item").getElementsByTagName('tbody')[0];

            if (tableInfoTypes) {
                let cpt = 0;
                let tr = document.createElement('tr');

                for (const key in itemTypesData) {
                    if (itemTypesData.hasOwnProperty(key)) {
                        const tdName = document.createElement('td');
                        tdName.textContent = itemTypesData[key].name;

                        const tdImg = document.createElement('td');
                        const img = document.createElement('img');
                        img.src = itemTypesData[key].img;
                        img.alt = itemTypesData[key].name;
                        img.style.width = '50px';
                        tdImg.appendChild(img);

                        tr.appendChild(tdImg);
                        tr.appendChild(tdName);

                        cpt++;
                        if (cpt % 3 == 0) {
                            tableInfoTypes.appendChild(tr);
                            tr = document.createElement('tr');
                        }
                    }
                }

                if (tr.children.length > 0) {
                    tableInfoTypes.appendChild(tr);
                }
            }
        })
        .catch(error => console.error('Error fetching the JSON data:', error));



    const passwordInput = document.getElementById('password');
    const validateButton = document.getElementById('submit');
    const pswContainer = document.getElementById('psw-container');
    const arrayContainer = document.getElementById('content-container');

    validateButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (password === "a") {
            pswContainer.remove();
            arrayContainer.style.display = 'block';
        } else {
            alert('Mot de passe incorrect');
        }
    });

    // Ajoutez un écouteur d'événement pour la touche "Entrée"
    passwordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            validateButton.click();
        }
    });

    const infoBtn = document.getElementById('info-btn');
    const closeIntro = document.getElementById('close-intro');
    infoBtn.addEventListener('click', () => {
        introContainer.style.display = 'block';
    });

    closeIntro.addEventListener('click', () => {
        introContainer.style.display = 'none';
    });
});

function formatDate(dateString) {
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const dateParts = dateString.split('-');
    const year = dateParts[0];
    const month = months[parseInt(dateParts[1], 10) - 1];
    const day = parseInt(dateParts[2], 10);

    return `${day} ${month} ${year}`;
}

function listItems(data) {
    const itemNames = Object.keys(data);
    sRet = "";
    itemNames.forEach(item => {
        sRet += item + "\n";
    });
    console.log(sRet);
}