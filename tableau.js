

document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        fetch('./data/items.json').then(response => response.json()),
        fetch('./data/itemTypes.json').then(response => response.json())
    ])
    .then(([itemsData, itemTypesData]) => {
        // listItems(itemsData);
        const tableBody = document.getElementById('tbody-data-items');
        Object.keys(itemsData).forEach(key => {
            const item = itemsData[key];
            const priceKeys = Object.keys(item.price);
            const lastPriceKey = priceKeys[priceKeys.length - 1];
            const lastPrice = item.price[lastPriceKey].value;
            const lastPriceDate = item.price[lastPriceKey].date;

            const dateDiffInDays = (dateString) => {
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = Math.abs(now - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))-1;
                let sRet = `${diffDays} jour`;
                return diffDays > 1 ? sRet + "s" : sRet + "";
            };
            const lastPriceDateDiff = dateDiffInDays(lastPriceDate);

            moyenne_prix = 0;
            priceKeys.forEach(element => {
                moyenne_prix += parseInt(parseInt(item.price[element].value));
            });
            moyenne_prix = parseInt(moyenne_prix / priceKeys.length);

            const pourcentage = Math.round((lastPrice-moyenne_prix) * 100 / moyenne_prix);
            const symbole = pourcentage >= 0 ? '+' : '-';
            const pourcentageFormatte = `${symbole}${Math.abs(pourcentage).toFixed(0).toLocaleString('fr-FR')}`;

            let className = "";
            if (pourcentage > 0) {
                className = "augmentationPrix";
            }
            if (pourcentage < 0) {
                className = "diminutionPrix";
            }
            const row = document.createElement('tr');
            row.id = key;
            row.classList.add('item-row');
            let nom = key;
            if (item && item.info) {
                let rarityIcon = {
                    "mythique": " <img src=\"https://vertylo.github.io/wakassets/rarities/3.png\" class=\"icon-rarities\">",
                    "légendaire": " <img src=\"https://vertylo.github.io/wakassets/rarities/4.png\" class=\"icon-rarities\">",
                    "souvenir": " <img src=\"https://vertylo.github.io/wakassets/rarities/6.png\" class=\"icon-rarities\">",
                    "nouvelle": " <img src=\"https://vertylo.github.io/wakassets/rarities/1.png\" class=\"icon-rarities\">",
                    "ancienne": " <img src=\"https://vertylo.github.io/wakassets/rarities/0.png\" class=\"icon-rarities\">",
                    "+3 lv": " (+3 lv)",
                    "lv 50": " (lv 50)",
                }
                nom = key.trim() + rarityIcon[item.info];
            }

            row.innerHTML = `
                <td id="${itemTypesData[item.type].name}">
                    <img src="${itemTypesData[item.type].img}" class="non-selectable" />
                </td>
                <td>${nom}</td>
                <td>${lastPrice.toLocaleString('fr-FR')} </td>
                <td>${lastPriceDateDiff}</td>
                <td>${moyenne_prix.toLocaleString('fr-FR')}</td>
                <td class="${className} progression">${pourcentageFormatte}%</td>
            `;
            tableBody.appendChild(row);
        });

        const itemCountSpan = document.getElementById('totalItems');
        itemCountSpan.textContent = `${tableBody.rows.length}/${tableBody.rows.length}`;

        document.querySelectorAll('#thead-data-items th').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-column');
                if (!column) return; // Vérifiez si l'attribut data-column est défini
                const order = th.dataset.order = -(th.dataset.order || -1);
                const rows = Array.from(tableBody.querySelectorAll('tr'));

                // Retirer les classes de tri des autres en-têtes et réinitialiser l'ordre de tri
                document.querySelectorAll('#thead-data-items th').forEach(header => {
                    if (header !== th) {
                        header.classList.remove('sorted-asc', 'sorted-desc');
                        header.removeAttribute('data-order');
                    }
                });

                // Ajouter la classe de tri à l'en-tête cliqué
                th.classList.add(order === 1 ? 'sorted-asc' : 'sorted-desc');

                rows.sort((a, b) => {
                    const aCells = Array.from(a.querySelectorAll('#tbody-data-items tr td'));
                    const bCells = Array.from(b.querySelectorAll('#tbody-data-items tr td'));

                    let aCell, bCell;
                    let cellIndex = th.cellIndex;

                    // Ajuster l'index de la cellule si colspan est utilisé
                    // if (cellIndex >= 3) {
                    //     cellIndex += 1; // Sautez une cellule pour colspan=2
                    // }

                    aCell = aCells[cellIndex];
                    bCell = bCells[cellIndex];

                    if (!aCell || !bCell) return 0;

                    let aText = aCell.textContent.trim();
                    let bText = bCell.textContent.trim();

                    // Si la colonne est "type", comparez les sources des images
                    if (column === 'type') {
                        aText = aCell.querySelector('img').src;
                        bText = bCell.querySelector('img').src;
                    }

                    // Si la colonne est "averagePrice", comparez les valeurs numériques
                    if (column === 'lastPriceDate') {
                        const aValue = parseInt(aText.split(' '));
                        const bValue = parseInt(bText.split(' '));
                        return order * (aValue - bValue);
                    }


                    // Si la colonne est "averagePrice", comparez les valeurs numériques
                    if (column === 'averagePrice') {
                        const aValue = parseFloat(aText.replace(/\s/g, ''));
                        const bValue = parseFloat(bText.replace(/\s/g, ''));
                        return order * (aValue - bValue);
                    }

                    // Si la colonne est "progression", comparez les valeurs de pourcentage
                    if (column === 'progression') {
                        const aValue = parseFloat(aText.replace('%', '').replace('+', '').replace('-', '-'));
                        const bValue = parseFloat(bText.replace('%', '').replace('+', '').replace('-', '-'));
                        return order * (aValue - bValue);
                    }
                    const aValue = aText.replace(/\s/g, '');
                    const bValue = bText.replace(/\s/g, '');

                    if (!isNaN(aValue) && !isNaN(bValue)) {
                        return order * (parseFloat(aValue) - parseFloat(bValue));
                    } else {
                        return order * aText.localeCompare(bText);
                    }
                });

                rows.forEach(row => tableBody.appendChild(row));
            });
        });

        // Ajout du gestionnaire d'événements pour la recherche
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerms = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('&');
                const rows = Array.from(tableBody.querySelectorAll('tr'));
                let visibleItemCount = 0;
        
                rows.forEach(row => {
                    let rowMatches = false;
                    searchTerms.forEach(searchTerm => {
                        searchTerm = searchTerm.trim();
                        if (searchTerm != "$") {
                            if (searchTerm.startsWith("$")) {
                                const itemIdCell = row.querySelector('td:nth-child(1)');
                                
                                if (itemIdCell) {
                                    const itemTypeId = itemIdCell.id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                    if (itemTypeId.includes(searchTerm.slice(1))) {
                                        rowMatches = true;
                                    }
                                }
                            } else {
                                const itemId = row.id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                
                                if (itemId.includes(searchTerm)) {
                                    rowMatches = true;
                                }
                            }
                        }

                        if (rowMatches) {
                            row.style.display = '';
                            visibleItemCount++;
                        } else {
                            row.style.display = 'none';
                        }
    
                        
                    });

                });
                
        
                itemCountSpan.textContent = `${visibleItemCount}/${tableBody.rows.length}`;
            }, 600);
        });

        const btnCroixRecherche = document.getElementById('btn-onglet-recherche-croix');
        btnCroixRecherche.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        });
        
        // Ajouter un écouteur d'événements à chaque cellule du tableau
        const fullTable = document.querySelectorAll('table#table-info-item');
        const titleInfo = document.getElementById('title-info');tableRows = document.querySelectorAll('#tbody-data-items tr.item-row td:not(:nth-child(2))');


        const priceChartCanvas = document.getElementById('priceChart');
        let priceChart;


        tableRows.forEach((cell, index) => {
            cell.addEventListener('click', () => {
                const infoItemContainer = document.querySelector('.info-item-container');
                const infoItemTbody = document.querySelector('#tbody-info-items');

                // Rendre visible le composant
                infoItemContainer.style.visibility = 'visible';
    
                // Obtenir les informations de la ligne parente de la cellule cliquée
                const row = cell.parentElement;
                const cells = row.querySelectorAll('td');
                const indice = cells[0].textContent;
                const nomItemClic = cells[1].textContent;
                const prixClic = cells[2].textContent;
                infoItemTbody.innerHTML = "";
                titleInfo.textContent = nomItemClic;
                const dates = [];
                const values = [];
                Object.values(itemsData[row.id].price).forEach((item, index) => {
                    const formattedValue = item.value.toLocaleString('fr-FR');
                    const formattedItemDate = formatDate(item.date);
                    dates.push(item.date);
                    values.push(item.value);
                    infoItemTbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formattedItemDate}</td>
                            <td>${formattedValue}</td>
                        </tr>
                    `;
                });

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
            });

        });

        const introContainer = document.getElementById('intro-container');
        
        const closeButton = document.querySelector('.close');
        closeButton.addEventListener('click', () => {
            closeButton.parentElement.style.visibility = 'hidden';
        });

        document.addEventListener("keydown", function(event) {
            if (event.key === "Escape" || event.keyCode === 27) {
                introContainer.style.display = 'none';
                closeButton.parentElement.style.visibility = 'hidden';
            }

            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault(); // Empêche le comportement par défaut du navigateur
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus(); // Définit le focus sur l'élément searchInput
                }
            }
        });

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

        // Sélectionnez l'élément tbody où les tr seront ajoutés
        const tableInfoTypes = document.getElementById("info-types-item").getElementsByTagName('tbody')[0];

        if (!tableInfoTypes) {
            console.error('Element with ID "info-types-item" or its tbody not found.');
        } else {
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
                    img.style.width = '50px'; // Ajustez la taille de l'image si nécessaire
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

            // Append the last row if it has any cells
            if (tr.children.length > 0) {
                tableInfoTypes.appendChild(tr);
            }
        }
    })
    .catch(error => console.error('Error fetching the JSON data:', error));
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