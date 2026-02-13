console.log('Script loaded!');

class Game {
    constructor() {
        console.log('1. Game constructor called');
        this.canvas = document.getElementById('gameCanvas');
        console.log('2. Canvas element:', this.canvas);
        
        if (!this.canvas) {
            throw new Error('Canvas element not found!');
        }
        
        this.ctx = this.canvas.getContext('2d');
        console.log('3. Context created');
        this.resizeCanvas();
        console.log('4. Canvas resized to', this.canvas.width, 'x', this.canvas.height);
        
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        this.camera = { x: 0, y: 0 };
        
        this.player = null;
        this.bots = [];
        this.shapes = [];
        this.bullets = [];
        
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.joystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 };
        this.shootButton = { active: false };
        
        console.log('5. Starting init...');
        this.init();
        console.log('6. Starting event listeners...');
        this.setupEventListeners();
        console.log('7. Starting game loop...');
        this.gameLoop();
        console.log('8. Game initialized successfully!');
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Для мобильных устройств учитываем адресную строку
        if (this.isMobile) {
            // Используем visualViewport если доступен
            if (window.visualViewport) {
                this.canvas.width = window.visualViewport.width;
                this.canvas.height = window.visualViewport.height;
            } else {
                // Фоллбэк для старых браузеров
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        }
    }
    
    init() {
        this.player = new Tank(this.worldWidth / 2, this.worldHeight / 2, '#4A90E2', true, 'Player');
        
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.worldWidth;
            const y = Math.random() * this.worldHeight;
            const bot = new Tank(x, y, '#E74C3C', false, `Bot ${i + 1}`);
            
            // Боты немного сильнее
            bot.stats.bulletDamage *= 1.3;
            bot.stats.bulletSpeed *= 1.1;
            bot.stats.reload *= 0.9;
            
            this.bots.push(bot);
        }
        
        this.spawnShapes();
    }
    
    spawnShapes() {
        for (let i = 0; i < 50; i++) {
            this.shapes.push(new Shape(
                Math.random() * this.worldWidth,
                Math.random() * this.worldHeight,
                'square', 20, '#FFD700', 10, 10
            ));
        }
        
        for (let i = 0; i < 30; i++) {
            this.shapes.push(new Shape(
                Math.random() * this.worldWidth,
                Math.random() * this.worldHeight,
                'triangle', 25, '#FF6B6B', 25, 25
            ));
        }
        
        for (let i = 0; i < 15; i++) {
            this.shapes.push(new Shape(
                Math.random() * this.worldWidth,
                Math.random() * this.worldHeight,
                'pentagon', 35, '#FF69B4', 75, 75
            ));
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            
            // Поддержка русской раскладки
            const keyMap = {
                'ц': 'w', 'ф': 'a', 'ы': 's', 'в': 'd',
                'w': 'w', 'a': 'a', 's': 's', 'd': 'd'
            };
            
            if (keyMap[key]) {
                this.keys[keyMap[key]] = true;
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            
            // Поддержка русской раскладки
            const keyMap = {
                'ц': 'w', 'ф': 'a', 'ы': 's', 'в': 'd',
                'w': 'w', 'a': 'a', 's': 's', 'd': 'd'
            };
            
            if (keyMap[key]) {
                this.keys[keyMap[key]] = false;
            }
        });
        
        if (this.isMobile) {
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                for (let touch of e.touches) {
                    const x = touch.clientX;
                    const y = touch.clientY;
                    
                    if (x < this.canvas.width / 2) {
                        this.joystick.active = true;
                        this.joystick.startX = x;
                        this.joystick.startY = y;
                        this.joystick.currentX = x;
                        this.joystick.currentY = y;
                    } else {
                        this.shootButton.active = true;
                        this.mouse.x = x;
                        this.mouse.y = y;
                        this.mouse.down = true;
                    }
                }
            });
            
            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let touch of e.touches) {
                    const x = touch.clientX;
                    const y = touch.clientY;
                    
                    if (x < this.canvas.width / 2 && this.joystick.active) {
                        this.joystick.currentX = x;
                        this.joystick.currentY = y;
                        
                        const dx = this.joystick.currentX - this.joystick.startX;
                        const dy = this.joystick.currentY - this.joystick.startY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const maxDistance = 60;
                        
                        if (distance > 0) {
                            this.joystick.dx = dx / maxDistance;
                            this.joystick.dy = dy / maxDistance;
                            
                            const magnitude = Math.sqrt(this.joystick.dx * this.joystick.dx + this.joystick.dy * this.joystick.dy);
                            if (magnitude > 1) {
                                this.joystick.dx /= magnitude;
                                this.joystick.dy /= magnitude;
                            }
                        }
                    } else if (x >= this.canvas.width / 2) {
                        this.mouse.x = x;
                        this.mouse.y = y;
                    }
                }
            });
            
            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const touches = Array.from(e.touches);
                
                const leftTouch = touches.find(t => t.clientX < this.canvas.width / 2);
                if (!leftTouch) {
                    this.joystick.active = false;
                    this.joystick.dx = 0;
                    this.joystick.dy = 0;
                }
                
                const rightTouch = touches.find(t => t.clientX >= this.canvas.width / 2);
                if (!rightTouch) {
                    this.shootButton.active = false;
                    this.mouse.down = false;
                }
            });
        } else {
            this.canvas.addEventListener('mousemove', (e) => {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            });
            
            this.canvas.addEventListener('mousedown', (e) => {
                this.mouse.down = true;
            });
            
            this.canvas.addEventListener('mouseup', () => {
                this.mouse.down = false;
            });
        }
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Для мобильных - обработка изменения viewport
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
        }
    }
    
    update() {
        if (!this.player || !this.player.alive) return;
        
        this.updatePlayer();
        
        this.bots.forEach(bot => {
            if (bot.alive) {
                bot.updateBot(this);
            }
        });
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            
            if (bullet.x < 0 || bullet.x > this.worldWidth || 
                bullet.y < 0 || bullet.y > this.worldHeight) {
                return false;
            }
            
            return bullet.health > 0;
        });
        
        this.checkCollisions();
        this.updateCamera();
        this.updateUI();
        
        if (this.shapes.length < 95) {
            this.spawnShapes();
        }
    }
    
    updatePlayer() {
        let dx = 0, dy = 0;
        
        if (this.isMobile && this.joystick.active) {
            dx = this.joystick.dx;
            dy = this.joystick.dy;
        } else {
            if (this.keys['w']) dy -= 1;
            if (this.keys['s']) dy += 1;
            if (this.keys['a']) dx -= 1;
            if (this.keys['d']) dx += 1;
            
            if (dx !== 0 && dy !== 0) {
                const magnitude = Math.sqrt(dx * dx + dy * dy);
                dx /= magnitude;
                dy /= magnitude;
            }
        }
        
        this.player.move(dx, dy);
        
        const worldMouseX = this.mouse.x + this.camera.x - this.canvas.width / 2;
        const worldMouseY = this.mouse.y + this.camera.y - this.canvas.height / 2;
        this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);
        
        if (this.mouse.down) {
            const bullet = this.player.shoot();
            if (bullet) {
                this.bullets.push(bullet);
            }
        }
        
        this.player.regenerate();
        
        this.player.x = Math.max(this.player.radius, Math.min(this.worldWidth - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.worldHeight - this.player.radius, this.player.y));
    }
    
    updateCamera() {
        this.camera.x = this.player.x;
        this.camera.y = this.player.y;
    }

    checkCollisions() {
        this.bullets.forEach(bullet => {
            this.shapes.forEach(shape => {
                if (this.checkCircleCollision(bullet, shape)) {
                    shape.health -= bullet.damage;
                    bullet.health -= shape.health;
                    
                    if (shape.health <= 0) {
                        bullet.owner.addExp(shape.exp);
                        this.shapes = this.shapes.filter(s => s !== shape);
                    }
                }
            });
        });
        
        this.bullets.forEach(bullet => {
            const targets = [this.player, ...this.bots].filter(t => t.alive && t !== bullet.owner);
            
            targets.forEach(tank => {
                if (this.checkCircleCollision(bullet, tank)) {
                    tank.health -= bullet.damage;
                    bullet.health -= 10;
                    
                    // Проверка смерти
                    if (tank.health <= 0) {
                        tank.health = 0;
                        tank.alive = false;
                        bullet.owner.addExp(tank.level * 20);
                        
                        if (!tank.isPlayer) {
                            setTimeout(() => {
                                tank.respawn(this.worldWidth, this.worldHeight);
                            }, 5000);
                        } else {
                            // Игрок умер - респавн через 3 секунды
                            setTimeout(() => {
                                tank.respawn(this.worldWidth, this.worldHeight);
                                tank.resetStats();
                            }, 3000);
                        }
                    }
                }
            });
        });
        
        [this.player, ...this.bots].forEach(tank => {
            if (!tank.alive) return;
            
            this.shapes.forEach(shape => {
                if (this.checkCircleCollision(tank, shape)) {
                    shape.health -= tank.stats.bodyDamage;
                    tank.health -= 5;
                    
                    // Проверка смерти танка
                    if (tank.health <= 0) {
                        tank.health = 0;
                        tank.alive = false;
                        
                        if (!tank.isPlayer) {
                            setTimeout(() => {
                                tank.respawn(this.worldWidth, this.worldHeight);
                            }, 5000);
                        } else {
                            setTimeout(() => {
                                tank.respawn(this.worldWidth, this.worldHeight);
                                tank.resetStats();
                            }, 3000);
                        }
                    }
                    
                    if (shape.health <= 0) {
                        tank.addExp(shape.exp);
                        this.shapes = this.shapes.filter(s => s !== shape);
                    }
                }
            });
        });
    }
    
    checkCircleCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }
    
    updateUI() {
        document.getElementById('level').textContent = `Level: ${this.player.level}`;
        document.getElementById('score').textContent = `Score: ${Math.floor(this.player.score)}`;
        document.getElementById('upgrade-points').textContent = `Points: ${this.player.upgradePoints}`;
        
        Object.keys(this.player.stats).forEach(stat => {
            const fill = document.querySelector(`[data-stat="${stat}"]`);
            if (fill) {
                const level = this.player.upgradeLevels[stat];
                fill.style.width = `${(level / 7) * 100}%`;
            }
        });
        
        const allTanks = [this.player, ...this.bots].filter(t => t.alive);
        allTanks.sort((a, b) => b.score - a.score);
        
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        allTanks.slice(0, 5).forEach(tank => {
            const li = document.createElement('li');
            li.textContent = `${tank.name} - ${Math.floor(tank.score)}`;
            li.style.color = tank.isPlayer ? '#4A90E2' : '#E74C3C';
            leaderboardList.appendChild(li);
        });
    }
    
    upgradePlayer(stat) {
        if (this.player.upgradePoints > 0 && this.player.upgradeLevels[stat] < 7) {
            this.player.upgradeLevels[stat]++;
            this.player.upgradePoints--;
            this.player.applyUpgrades();
        }
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x + this.canvas.width / 2, -this.camera.y + this.canvas.height / 2);
        
        this.drawGrid();
        
        this.shapes.forEach(shape => shape.draw(this.ctx));
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        this.bots.forEach(bot => {
            if (bot.alive) bot.draw(this.ctx);
        });
        
        if (this.player.alive) {
            this.player.draw(this.ctx);
        }
        
        this.ctx.restore();
        
        if (this.isMobile) {
            this.drawMobileControls();
        }
        
        // Death screen
        if (!this.player.alive) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            
            // Адаптивные размеры шрифтов
            const titleSize = Math.min(48, this.canvas.width / 15);
            const textSize = Math.min(24, this.canvas.width / 30);
            const smallSize = Math.min(18, this.canvas.width / 40);
            
            this.ctx.font = `bold ${titleSize}px Arial`;
            this.ctx.fillText('YOU DIED', this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            this.ctx.font = `${textSize}px Arial`;
            this.ctx.fillText(`Final Score: ${Math.floor(this.player.score)}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            this.ctx.fillText(`Level: ${this.player.level}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
            
            this.ctx.font = `${smallSize}px Arial`;
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText('Respawning...', this.canvas.width / 2, this.canvas.height / 2 + 80);
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize - this.canvas.width / 2;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize - this.canvas.height / 2;
        
        for (let x = startX; x < this.camera.x + this.canvas.width / 2; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.camera.y - this.canvas.height / 2);
            this.ctx.lineTo(x, this.camera.y + this.canvas.height / 2);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < this.camera.y + this.canvas.height / 2; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.camera.x - this.canvas.width / 2, y);
            this.ctx.lineTo(this.camera.x + this.canvas.width / 2, y);
            this.ctx.stroke();
        }
    }
    
    drawMobileControls() {
        if (this.joystick.active) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(this.joystick.startX, this.joystick.startY, 60, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(this.joystick.currentX, this.joystick.currentY, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Адаптивные подсказки
        const fontSize = Math.min(16, this.canvas.width / 40);
        const bottomOffset = Math.min(30, this.canvas.height / 20);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Movement', this.canvas.width / 4, this.canvas.height - bottomOffset);
        this.ctx.fillText('Shoot', this.canvas.width * 3 / 4, this.canvas.height - bottomOffset);
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}


class Tank {
    constructor(x, y, color, isPlayer, name) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.color = color;
        this.isPlayer = isPlayer;
        this.name = name;
        this.angle = 0;
        this.alive = true;
        
        this.level = 1;
        this.exp = 0;
        this.score = 0;
        this.expToNextLevel = 100;
        this.upgradePoints = 0;
        
        this.upgradeLevels = {
            healthRegen: 0,
            maxHealth: 0,
            bodyDamage: 0,
            bulletSpeed: 0,
            bulletPenetration: 0,
            bulletDamage: 0,
            reload: 0,
            moveSpeed: 0
        };
        
        this.baseStats = {
            healthRegen: 0.1,
            maxHealth: 100,
            bodyDamage: 10,
            bulletSpeed: 8,
            bulletPenetration: 10,
            bulletDamage: 10,
            reload: 30,
            moveSpeed: 3
        };
        
        this.stats = { ...this.baseStats };
        this.health = this.stats.maxHealth;
        this.shootCooldown = 0;
        
        this.aiTarget = null;
        this.aiChangeDirectionTimer = 0;
        this.aiDirection = { x: 0, y: 0 };
    }
    
    move(dx, dy) {
        this.x += dx * this.stats.moveSpeed;
        this.y += dy * this.stats.moveSpeed;
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.stats.reload;
            
            const bulletX = this.x + Math.cos(this.angle) * (this.radius + 15);
            const bulletY = this.y + Math.sin(this.angle) * (this.radius + 15);
            
            return new Bullet(
                bulletX, bulletY,
                Math.cos(this.angle) * this.stats.bulletSpeed,
                Math.sin(this.angle) * this.stats.bulletSpeed,
                this.stats.bulletDamage,
                this.stats.bulletPenetration,
                this
            );
        }
        this.shootCooldown--;
        return null;
    }
    
    regenerate() {
        if (this.health < this.stats.maxHealth) {
            this.health = Math.min(this.stats.maxHealth, this.health + this.stats.healthRegen);
        }
    }
    
    addExp(amount) {
        this.exp += amount;
        this.score += amount;
        
        while (this.exp >= this.expToNextLevel && this.level < 45) {
            this.exp -= this.expToNextLevel;
            this.level++;
            this.expToNextLevel = Math.floor(100 * Math.pow(1.1, this.level - 1));
            this.upgradePoints++;
            
            if (!this.isPlayer) {
                this.autoUpgrade();
            }
        }
    }
    
    autoUpgrade() {
        const stats = Object.keys(this.upgradeLevels);
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        
        if (this.upgradeLevels[randomStat] < 7) {
            this.upgradeLevels[randomStat]++;
            this.upgradePoints--;
            this.applyUpgrades();
        }
    }
    
    applyUpgrades() {
        Object.keys(this.upgradeLevels).forEach(stat => {
            const level = this.upgradeLevels[stat];
            const base = this.baseStats[stat];
            
            if (stat === 'reload') {
                this.stats[stat] = base * Math.pow(0.85, level);
            } else if (stat === 'healthRegen') {
                this.stats[stat] = base + level * 0.15;
            } else {
                this.stats[stat] = base * (1 + level * 0.2);
            }
        });
        
        if (this.health > this.stats.maxHealth) {
            this.health = this.stats.maxHealth;
        }
    }
    
    updateBot(game) {
        this.aiChangeDirectionTimer--;
        
        if (this.aiChangeDirectionTimer <= 0) {
            this.aiDirection.x = (Math.random() - 0.5) * 2;
            this.aiDirection.y = (Math.random() - 0.5) * 2;
            
            const magnitude = Math.sqrt(this.aiDirection.x * this.aiDirection.x + this.aiDirection.y * this.aiDirection.y);
            if (magnitude > 0) {
                this.aiDirection.x /= magnitude;
                this.aiDirection.y /= magnitude;
            }
            
            this.aiChangeDirectionTimer = 60 + Math.random() * 120;
        }
        
        this.move(this.aiDirection.x, this.aiDirection.y);
        
        this.x = Math.max(this.radius, Math.min(game.worldWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(game.worldHeight - this.radius, this.y));
        
        let closestTarget = null;
        let closestDistance = 600;
        
        // Приоритет: игрок > другие боты > фигуры
        if (game.player.alive) {
            const dx = game.player.x - this.x;
            const dy = game.player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = game.player;
            }
        }
        
        // Атака других ботов
        game.bots.forEach(bot => {
            if (bot !== this && bot.alive) {
                const dx = bot.x - this.x;
                const dy = bot.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance * 0.8) {
                    closestDistance = distance;
                    closestTarget = bot;
                }
            }
        });
        
        // Фигуры как запасная цель
        if (!closestTarget || closestDistance > 400) {
            game.shapes.forEach(shape => {
                const dx = shape.x - this.x;
                const dy = shape.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 300) {
                    closestDistance = distance;
                    closestTarget = shape;
                }
            });
        }
        
        // Прицеливание и стрельба
        if (closestTarget) {
            this.angle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);
            
            // Боты стреляют чаще и точнее
            const shootChance = closestTarget === game.player ? 0.15 : 0.12;
            
            if (Math.random() < shootChance) {
                const bullet = this.shoot();
                if (bullet) {
                    game.bullets.push(bullet);
                }
            }
            
            // Движение к цели если далеко, от цели если близко
            if (closestDistance > 250) {
                const moveToX = (closestTarget.x - this.x) / closestDistance;
                const moveToY = (closestTarget.y - this.y) / closestDistance;
                this.aiDirection.x = moveToX * 0.7 + this.aiDirection.x * 0.3;
                this.aiDirection.y = moveToY * 0.7 + this.aiDirection.y * 0.3;
            } else if (closestDistance < 150) {
                const moveAwayX = -(closestTarget.x - this.x) / closestDistance;
                const moveAwayY = -(closestTarget.y - this.y) / closestDistance;
                this.aiDirection.x = moveAwayX * 0.5 + this.aiDirection.x * 0.5;
                this.aiDirection.y = moveAwayY * 0.5 + this.aiDirection.y * 0.5;
            }
        }
        
        this.regenerate();
    }
    
    respawn(worldWidth, worldHeight) {
        this.x = Math.random() * worldWidth;
        this.y = Math.random() * worldHeight;
        this.health = this.stats.maxHealth;
        this.alive = true;
    }
    
    resetStats() {
        // Сброс всех улучшений
        this.level = 1;
        this.exp = 0;
        this.score = 0;
        this.expToNextLevel = 100;
        this.upgradePoints = 0;
        
        Object.keys(this.upgradeLevels).forEach(key => {
            this.upgradeLevels[key] = 0;
        });
        
        this.stats = { ...this.baseStats };
        this.health = this.stats.maxHealth;
    }
    
    draw(ctx) {
        // Полоска здоровья
        if (this.health < this.stats.maxHealth) {
            const barWidth = 60;
            const barHeight = 6;
            const barX = this.x - barWidth / 2;
            const barY = this.y - 40;
            
            // Фон полоски
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Здоровье (с защитой от отрицательных значений)
            const healthPercent = Math.max(0, Math.min(1, this.health / this.stats.maxHealth));
            ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            
            // Обводка
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        const barrelLength = 35;
        const barrelWidth = 12;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
        ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);
        
        ctx.restore();
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} [${this.level}]`, this.x, this.y - 50);
    }
}

class Bullet {
    constructor(x, y, vx, vy, damage, penetration, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
        this.damage = damage;
        this.health = penetration;
        this.owner = owner;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.owner.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

class Shape {
    constructor(x, y, type, size, color, health, exp) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = size;
        this.radius = size;
        this.color = color;
        this.maxHealth = health;
        this.health = health;
        this.exp = exp;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        this.rotation += this.rotationSpeed;
        
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        
        if (this.type === 'square') {
            ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === 'triangle') {
            for (let i = 0; i < 3; i++) {
                const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else if (this.type === 'pentagon') {
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
        
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#555';
            ctx.fillRect(this.x - this.size / 2, this.y - this.size - 5, this.size, 3);
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(this.x - this.size / 2, this.y - this.size - 5, this.size * (this.health / this.maxHealth), 3);
        }
    }
}

let game;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

function initGame() {
    console.log('Game starting...');
    try {
        game = new Game();
        console.log('Game started! Use WASD to move, Mouse to aim and shoot.');
    } catch (error) {
        console.error('Error starting game:', error);
    }
}
