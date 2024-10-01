document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        fetch('./data/items.json').then(response => response.json()),
        fetch('./data/itemTypes.json').then(response => response.json())
    ])
    .then(([itemsData, itemTypesData]) => {
        const tableBody = document.querySelector('table tbody');
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

            const diff = lastPrice-moyenne_prix;
            const className = diff > 0 ? "diminutionPrix" : "augmentationPrix";
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${itemTypesData[item.type]}" alt="${item.type}" /></td>
                <td>${key}</td>
                <td>${lastPrice.toLocaleString('fr-FR')} </td>
                <td>${lastPriceDateDiff}</td>
                <td>${moyenne_prix.toLocaleString('fr-FR')}</td>
                <td class="${className}">${(diff).toLocaleString('fr-FR')}</td>
                <td class="addPrixBtn">+</td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-column');
                if (!column) return; // Vérifiez si l'attribut data-column est défini
                const order = th.dataset.order = -(th.dataset.order || -1);
                const rows = Array.from(tableBody.querySelectorAll('tr'));

                // Retirer les classes de tri des autres en-têtes et réinitialiser l'ordre de tri
                document.querySelectorAll('th').forEach(header => {
                    if (header !== th) {
                        header.classList.remove('sorted-asc', 'sorted-desc');
                        header.removeAttribute('data-order');
                    }
                });

                // Ajouter la classe de tri à l'en-tête cliqué
                th.classList.add(order === 1 ? 'sorted-asc' : 'sorted-desc');

                rows.sort((a, b) => {
                    const aCells = Array.from(a.querySelectorAll('td'));
                    const bCells = Array.from(b.querySelectorAll('td'));

                    let aCell, bCell;
                    let cellIndex = th.cellIndex;

                    // Ajuster l'index de la cellule si colspan est utilisé
                    if (cellIndex >= 3) {
                        cellIndex += 1; // Sautez une cellule pour colspan=2
                    }

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
                    if (column === 'averagePrice') {
                        const aValue = parseFloat(aText.replace(/\s/g, ''));
                        const bValue = parseFloat(bText.replace(/\s/g, ''));
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
                const searchTerm = searchInput.value.toLowerCase();
                const rows = Array.from(tableBody.querySelectorAll('tr'));

                rows.forEach(row => {
                    const itemNameCell = row.querySelector('td:nth-child(2)');
                    if (itemNameCell) {
                        const itemName = itemNameCell.textContent.toLowerCase();
                        if (itemName.includes(searchTerm)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    }
                });
            }, 600); // 2 secondes de délai
        });

        const overlay = document.querySelector('.newPriceFormContainer');
        const itemToAddPrice = document.getElementById('itemToAddPrice');
        const priceInput = document.getElementById('priceInput');
        const validerPrixBtn = document.querySelector('.validerPrixBtn');
    
        document.querySelectorAll('.addPrixBtn').forEach(button => {
            button.addEventListener('click', function () {
                const row = button.closest('tr');
                const itemName = row.querySelector('td:nth-child(2)').textContent;
                console.log("Item Name:", itemName);
    
                // Mettre à jour le contenu de la div itemToAddPrice
                itemToAddPrice.textContent = itemName;
    
                // Afficher l'overlay
                overlay.classList.add('visible');
            });
        });
    
        overlay.addEventListener('click', function () {
            if (overlay.classList.contains('visible')) {
                overlay.classList.remove('visible');
            }
        });
    
        // Empêcher la propagation de l'événement de clic sur l'input
        priceInput.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        // Ajouter un gestionnaire d'événements pour le bouton "Valider"
        validerPrixBtn.addEventListener('click', function () {
            const itemName = itemToAddPrice.textContent;
            const newPrice = parseFloat(priceInput.value);
    
            fetch('/api/add-price', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itemName, newPrice })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                overlay.classList.remove('visible');
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    })
    .catch(error => console.error('Error fetching the JSON data:', error));
});

