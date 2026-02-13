/* ============================================
   CHARTS UTILS - Chart.js Wrapper Helpers
   ============================================ */

const ChartUtils = {
    instances: {},

    _getThemeColors() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        if (theme === 'light') {
            return [
                '#6366f1', '#8b5cf6', '#ec4899', '#dc2626',
                '#d97706', '#f59e0b', '#16a34a', '#0891b2',
                '#4f46e5', '#7c3aed', '#be185d', '#ea580c',
                '#0284c7', '#059669', '#b91c1c', '#7c3aed'
            ];
        } else if (theme === 'pink') {
            return [
                '#ec4899', '#f472b6', '#f9a8d4', '#f43f5e',
                '#fb923c', '#fbbf24', '#34d399', '#22d3ee',
                '#f472b6', '#ec4899', '#be185d', '#f97316',
                '#06b6d4', '#10b981', '#ef4444', '#f472b6'
            ];
        } else if (theme === 'blue') {
            return [
                '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa',
                '#fb923c', '#fbbf24', '#22c55e', '#06b6d4',
                '#6366f1', '#4f46e5', '#14b8a6', '#f97316',
                '#0284c7', '#10b981', '#ef4444', '#3b82f6'
            ];
        } else { // dark
            return [
                '#818cf8', '#a855f7', '#ec4899', '#f43f5e',
                '#fb923c', '#fbbf24', '#34d399', '#22d3ee',
                '#6366f1', '#8b5cf6', '#14b8a6', '#f97316',
                '#06b6d4', '#10b981', '#ef4444', '#8b5cf6'
            ];
        }
    },

    get defaultColors() {
        return this._getThemeColors();
    },

    _getTextColor() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        if (theme === 'light') return '#1e293b';
        if (theme === 'pink') return '#831843';
        if (theme === 'blue') return '#e2e8f0';
        return '#e2e8f0';
    },

    _getGridColor() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        if (theme === 'light') return 'rgba(0,0,0,0.06)';
        if (theme === 'pink') return 'rgba(236,72,153,0.1)';
        if (theme === 'blue') return 'rgba(59,130,246,0.1)';
        return 'rgba(255,255,255,0.06)';
    },

    destroy(canvasId) {
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
            delete this.instances[canvasId];
        }
    },

    _create(canvasId, config) {
        this.destroy(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, config);
        this.instances[canvasId] = chart;
        return chart;
    },

    pie(canvasId, labels, data, options = {}) {
        return this._create(canvasId, {
            type: options.doughnut ? 'doughnut' : 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: options.colors || this.defaultColors.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: options.legendPosition || 'bottom',
                        labels: { padding: 12, font: { size: 12 }, color: this._getTextColor() }
                    },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined
                },
                ...(options.onClick ? { onClick: options.onClick } : {})
            }
        });
    },

    doughnut(canvasId, labels, data, options = {}) {
        return this.pie(canvasId, labels, data, { ...options, doughnut: true });
    },

    bar(canvasId, labels, datasets, options = {}) {
        const formattedDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            backgroundColor: ds.color || this.defaultColors[i],
            borderRadius: 6,
            borderSkipped: false,
            ...ds
        }));

        return this._create(canvasId, {
            type: 'bar',
            data: { labels, datasets: formattedDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { color: this._getTextColor() } },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: this._getGridColor() },
                        ticks: { font: { size: 11 }, color: this._getTextColor() }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 }, color: this._getTextColor() }
                    }
                },
                ...(options.onClick ? { onClick: options.onClick } : {})
            }
        });
    },

    line(canvasId, labels, datasets, options = {}) {
        const formattedDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            borderColor: ds.color || this.defaultColors[i],
            backgroundColor: (ds.color || this.defaultColors[i]) + '20',
            fill: ds.fill !== undefined ? ds.fill : true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            ...ds
        }));

        return this._create(canvasId, {
            type: 'line',
            data: { labels, datasets: formattedDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { color: this._getTextColor() } },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined
                },
                scales: {
                    y: {
                        beginAtZero: options.beginAtZero !== false,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    },

    horizontalBar(canvasId, labels, datasets, options = {}) {
        const formattedDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            backgroundColor: ds.color || ds.backgroundColor || this.defaultColors[i],
            borderRadius: 6,
            borderSkipped: false,
            ...ds
        }));

        return this._create(canvasId, {
            type: 'bar',
            data: { labels, datasets: formattedDatasets },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { color: this._getTextColor() } },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                },
                ...(options.onClick ? { onClick: options.onClick } : {})
            }
        });
    },

    area(canvasId, labels, datasets, options = {}) {
        const formattedDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            borderColor: ds.color || this.defaultColors[i],
            backgroundColor: (ds.color || this.defaultColors[i]) + '40',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2,
            ...ds
        }));

        return this._create(canvasId, {
            type: 'line',
            data: { labels, datasets: formattedDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { color: this._getTextColor() } },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined,
                    filler: { propagate: true }
                },
                scales: {
                    y: {
                        beginAtZero: options.beginAtZero !== false,
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        ticks: { font: { size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    },

    radar(canvasId, labels, datasets, options = {}) {
        const formattedDatasets = datasets.map((ds, i) => ({
            label: ds.label || '',
            data: ds.data,
            borderColor: ds.color || this.defaultColors[i],
            backgroundColor: (ds.color || this.defaultColors[i]) + '30',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: ds.color || this.defaultColors[i],
            ...ds
        }));

        return this._create(canvasId, {
            type: 'radar',
            data: { labels, datasets: formattedDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1, position: 'top', labels: { color: this._getTextColor() } },
                    title: options.title ? { display: true, text: options.title, font: { size: 14 } } : undefined
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: { color: this._getGridColor() },
                        angleLines: { color: this._getGridColor() },
                        pointLabels: { font: { size: 12 }, color: this._getTextColor() },
                        ticks: {
                            display: options.showTicks !== false,
                            font: { size: 10 },
                            color: this._getTextColor(),
                            backdropColor: 'transparent'
                        },
                        ...(options.max ? { max: options.max } : {})
                    }
                }
            }
        });
    },

    progressRing(canvasId, value, total, options = {}) {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return this._create(canvasId, {
            type: 'doughnut',
            data: {
                labels: ['Completado', 'Pendiente'],
                datasets: [{
                    data: [pct, 100 - pct],
                    backgroundColor: [options.color || '#34d399', 'rgba(255,255,255,0.08)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'centerText',
                afterDraw(chart) {
                    const { ctx, chartArea: { width, height, top, left } } = chart;
                    ctx.save();
                    ctx.font = `bold ${Math.min(width, height) * 0.25}px sans-serif`;
                    ctx.fillStyle = options.textColor || this._getTextColor();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${pct}%`, left + width / 2, top + height / 2);
                    ctx.restore();
                }
            }]
        });
    }
};
