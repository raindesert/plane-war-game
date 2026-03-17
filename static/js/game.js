// 游戏配置
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 6,
    bulletSpeed: 12,
    enemyBulletSpeed: 5,
    autoFireInterval: 200, // 自动射击间隔（毫秒）
    invincibleTime: 1000, // 无敌时间（毫秒）
    bossSpawnLevels: [3, 6, 9], // Boss出现的等级
    levelScoreThreshold: 1000, // 升级所需分数
};

// 检查DOM元素是否存在
function checkDOM() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas元素未找到!');
        return false;
    }
    return true;
}

// 等待DOM加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

function initGame() {
    console.log('初始化游戏...');
    if (!checkDOM()) return;

    // 加载玩家飞机图片
    playerImage = new Image();
    playerImage.src = '/static/img/player1.png';
    playerImage.onload = () => {
        console.log('玩家飞机图片加载完成');
        // 预渲染图片，将透明背景填充为深色背景
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = playerImage.width;
        canvas.height = playerImage.height;

        // 填充深色背景
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制图片（会保留透明部分）
        ctx.drawImage(playerImage, 0, 0);

        // 创建新的 Image 对象，保存预渲染后的图片
        const newImage = new Image();
        newImage.src = canvas.toDataURL();
        newImage.onload = () => {
            // 替换原来的图片对象
            Object.assign(playerImage, newImage);
            console.log('玩家飞机图片预渲染完成');
        };
    };
    playerImage.onerror = () => {
        console.error('玩家飞机图片加载失败');
    };

    // 加载敌机图片
    enemyImage = new Image();
    enemyImage.src = '/static/img/enemy.png';
    enemyImage.onload = () => {
        console.log('敌机图片加载完成');
        // 预渲染图片，将透明背景填充为深色背景
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = enemyImage.width;
        canvas.height = enemyImage.height;

        // 填充深色背景
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制图片（会保留透明部分）
        ctx.drawImage(enemyImage, 0, 0);

        // 创建新的 Image 对象，保存预渲染后的图片
        const newImage = new Image();
        newImage.src = canvas.toDataURL();
        newImage.onload = () => {
            // 替换原来的图片对象
            Object.assign(enemyImage, newImage);
            console.log('敌机图片预渲染完成');
        };
    };
    enemyImage.onerror = () => {
        console.error('敌机图片加载失败');
    };

    // 初始化星星
    initStars();
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    drawStars(ctx);

    // 绑定按钮事件
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', startGame);
    }

    // 绑定键盘事件
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        // 暂停游戏
        if (e.code === 'Escape') {
            if (gameState.isRunning && !gameState.isGameOver) {
                gameState.isPaused = !gameState.isPaused;
                console.log(gameState.isPaused ? '游戏已暂停' : '游戏继续');
            }
        }

        // 游戏结束后按 R 键重新开始
        if (e.code === 'KeyR' && gameState.isGameOver) {
            startGame();
        }

        // 阻止空格键滚动页面
        if (e.code === 'Space') {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    console.log('游戏初始化完成');
}


// 游戏状态
let gameState = {
    score: 0,
    level: 1,
    lives: 3,
    isRunning: false,
    isGameOver: false,
    isPaused: false,
    lastAutoFire: 0,
    hasLaserUpgrade: false, // 是否有激光升级
};

// 键盘状态
const keys = {};

// 实体容器
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let powerups = [];
let particles = [];
let explosions = [];

// 玩家飞机类
let playerImage = null;
// 敌机图片
let enemyImage = null;

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.bullets = 1; // 子弹数量
        this.hasShield = false; // 是否有护盾
        this.laserUpgrade = false; // 激光升级
        this.invincible = false; // 无敌状态
        this.invincibleTimer = 0;
        this.blinkTimer = 0;
    }

    update(deltaTime) {
        // 移动
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= CONFIG.playerSpeed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += CONFIG.playerSpeed;
        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= CONFIG.playerSpeed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += CONFIG.playerSpeed;

        // 边界限制
        this.x = Math.max(this.width / 2, Math.min(CONFIG.canvasWidth - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(CONFIG.canvasHeight - this.height / 2, this.y));

        // 自动射击
        const now = Date.now();
        if (now - gameState.lastAutoFire > CONFIG.autoFireInterval) {
            this.shoot();
            gameState.lastAutoFire = now;
        }

        // 无敌时间处理
        if (this.invincible) {
            this.blinkTimer += deltaTime;
            if (this.blinkTimer > 100) {
                this.invincible = false;
                this.blinkTimer = 0;
            }
        }
    }

    shoot() {
        if (!gameState.isRunning || gameState.isGameOver) return;

        const bulletCount = this.bullets;
        const spacing = 15;

        if (this.laserUpgrade) {
            // 激光升级效果
            for (let i = -1; i <= 1; i++) {
                bullets.push(new Bullet(
                    this.x + i * spacing,
                    this.y - this.height / 2,
                    0,
                    -CONFIG.bulletSpeed,
                    this.laserUpgrade ? 3 : 1
                ));
            }
        } else {
            // 普通发射
            for (let i = 0; i < bulletCount; i++) {
                bullets.push(new Bullet(
                    this.x + (i - bulletCount / 2 + 0.5) * spacing,
                    this.y - this.height / 2,
                    0,
                    -CONFIG.bulletSpeed,
                    this.laserUpgrade ? 3 : 1
                ));
            }
        }
    }

    takeDamage() {
        if (this.invincible || gameState.isGameOver) return;

        gameState.lives--;
        updateUI();

        // 屏幕震动
        shakeScreen();

        if (gameState.lives <= 0) {
            gameOver();
        } else {
            // 进入无敌时间
            this.invincible = true;
            this.blinkTimer = 0;
        }
    }

    draw(ctx) {
        if (this.invincible && Math.floor(this.blinkTimer / 100) % 2 === 0) {
            return; // 无敌时闪烁
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // 绘制激光升级发光效果
        if (this.laserUpgrade) {
            // 多层光晕效果（比护盾小）
            const colors = [
                { color: 'rgba(0, 255, 255, 0.15)', radius: 30 },
                { color: 'rgba(0, 200, 255, 0.25)', radius: 25 },
                { color: 'rgba(0, 150, 255, 0.35)', radius: 20 },
                { color: 'rgba(100, 100, 255, 0.45)', radius: 15 },
            ];

            colors.forEach(c => {
                ctx.beginPath();
                ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
                ctx.fillStyle = c.color;
                ctx.fill();
            });

            // 外圈旋转的激光环
            const time = Date.now() / 500;
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, 18 + i * 5, time + i * (Math.PI / 3), time + (i + 1) * (Math.PI / 3));
                ctx.stroke();
            }
        }

        // 绘制护盾
        if (this.hasShield) {
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 绘制飞机（使用图片）
        if (playerImage && playerImage.complete && playerImage.naturalHeight !== 0) {
            // 获取图片真实尺寸
            const imgWidth = playerImage.naturalWidth || playerImage.width;
            const imgHeight = playerImage.naturalHeight || playerImage.height;

            // 保持比例缩放
            const scale = Math.min(this.width / imgWidth, this.height / imgHeight);
            const drawWidth = imgWidth * scale;
            const drawHeight = imgHeight * scale;

            // 绘制图片，使其中心对齐到操作点（因为ctx.translate(this.x, this.y)原点已经在中心）
            ctx.drawImage(playerImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

            // 引擎火焰 - 以玩家中心为基准
            ctx.beginPath();
            ctx.moveTo(-this.width / 8, this.height / 3);
            ctx.lineTo(0, this.height / 3 + 15 + Math.random() * 10);
            ctx.lineTo(this.width / 8, this.height / 3);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, ${150 + Math.random() * 105}, 0, 0.8)`;
            ctx.fill();
        } else {
            // 如果图片还没加载完成，使用三角形代替
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.lineTo(0, this.height / 3);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
            gradient.addColorStop(0, '#4ecdc4');
            gradient.addColorStop(1, '#2d6a4f');
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-this.width / 4, 0);
            ctx.lineTo(-this.width / 2, this.height / 2);
            ctx.lineTo(-this.width / 6, this.height / 3);
            ctx.closePath();
            ctx.fillStyle = '#26a69a';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(this.width / 4, 0);
            ctx.lineTo(this.width / 2, this.height / 2);
            ctx.lineTo(this.width / 6, this.height / 3);
            ctx.closePath();
            ctx.fillStyle = '#26a69a';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-this.width / 8, this.height / 3);
            ctx.lineTo(0, this.height / 3 + 15 + Math.random() * 10);
            ctx.lineTo(this.width / 8, this.height / 3);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, ${150 + Math.random() * 105}, 0, 0.8)`;
            ctx.fill();
        }

        ctx.restore();
    }
}

// 子弹类
class Bullet {
    constructor(x, y, vx, vy, damage = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
        this.damage = damage;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // 边界检查
        if (this.y < 0 || this.y > CONFIG.canvasHeight ||
            this.x < 0 || this.x > CONFIG.canvasWidth) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ffd700');
        gradient.addColorStop(1, '#ff8c00');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// 敌机类
class Enemy {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (CONFIG.canvasWidth - 60) + 30;
        this.y = -60;
        this.markedForDeletion = false;

        // 根据类型设置属性
        switch (type) {
            case 'normal':
                this.width = 40;
                this.height = 40;
                this.speed = 2 + Math.random();
                this.health = 1;
                this.maxHealth = 1;
                this.score = 10;
                this.color = '#ff6b6b';
                break;
            case 'fast':
                this.width = 30;
                this.height = 30;
                this.speed = 4 + Math.random();
                this.health = 1;
                this.maxHealth = 1;
                this.score = 20;
                this.color = '#ffa500';
                break;
            case 'heavy':
                this.width = 60;
                this.height = 60;
                this.speed = 1 + Math.random();
                this.health = 3;
                this.maxHealth = 3;
                this.score = 50;
                this.color = '#9b59b6';
                break;
            case 'boss':
                this.width = 100;
                this.height = 80;
                this.speed = 1;
                this.health = 20;
                this.maxHealth = 20;
                this.score = 500;
                this.color = '#e74c3c';
                this.shootInterval = 2000;
                this.lastShot = Date.now();
                break;
        }
    }

    update(deltaTime) {
        this.y += this.speed;

        // Boss射击
        if (this.type === 'boss') {
            const now = Date.now();
            if (now - this.lastShot > this.shootInterval) {
                this.shoot();
                this.lastShot = now;
            }
        }

        // 边界检查
        if (this.y > CONFIG.canvasHeight + this.height) {
            this.markedForDeletion = true;
        }
    }

    shoot() {
        // Boss发射多颗子弹
        for (let i = -2; i <= 2; i++) {
            enemyBullets.push(new EnemyBullet(
                this.x + i * 15,
                this.y + this.height / 2,
                0,
                CONFIG.enemyBulletSpeed,
                1
            ));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 绘制敌机（使用图片）
        if (enemyImage && enemyImage.complete && enemyImage.naturalHeight !== 0) {
            // 获取图片真实尺寸
            const imgWidth = enemyImage.naturalWidth || enemyImage.width;
            const imgHeight = enemyImage.naturalHeight || enemyImage.height;

            // 保持比例缩放，确保图片不超过敌机大小
            const scale = Math.min(this.width / imgWidth, this.height / imgHeight);
            const drawWidth = imgWidth * scale;
            const drawHeight = imgHeight * scale;

            // 绘制图片，使其中心对齐到原点
            ctx.drawImage(enemyImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            // 如果图片还没加载完成，绘制占位矩形
            ctx.fillStyle = '#666';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }

        // 绘制生命值条（重型敌机和Boss）
        if (this.health < this.maxHealth || this.type === 'boss') {
            const barWidth = this.width;
            const barHeight = 5;
            const barY = -this.height / 2 - 10;

            ctx.fillStyle = '#333';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.markedForDeletion = true;
            return true;
        }
        return false;
    }
}

// 敌人子弹类
class EnemyBullet {
    constructor(x, y, vx, vy, damage = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 6;
        this.damage = damage;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.y > CONFIG.canvasHeight || this.y < 0 ||
            this.x < 0 || this.x > CONFIG.canvasWidth) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#ff4500');
        gradient.addColorStop(1, '#8b0000');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// 道具类
class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 15;
        this.speed = 2;
        this.rotation = 0;
        this.markedForDeletion = false;

        // 根据类型设置属性
        switch (type) {
            case 'double': // 增加火力
                this.color = '#ff4757';
                this.scoreBonus = 100;
                break;
            case 'shield': // 护盾
                this.color = '#1e90ff';
                this.scoreBonus = 100;
                break;
            case 'laser': // 激光升级
                this.color = '#2ed573';
                this.scoreBonus = 100;
                break;
            case 'life': // 额外生命
                this.color = '#ffa502';
                this.scoreBonus = 100;
                break;
        }
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.05;

        if (this.y > CONFIG.canvasHeight + this.radius) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.rotate(this.rotation);

        // 绘制道具形状
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, '#000');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 绘制图标
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        switch (this.type) {
            case 'double':
                ctx.fillText('D', 0, 0);
                break;
            case 'shield':
                ctx.fillText('S', 0, 0);
                break;
            case 'laser':
                ctx.fillText('L', 0, 0);
                break;
            case 'life':
                ctx.fillText('♥', 0, 0);
                break;
        }

        ctx.restore();
    }
}

// 粒子类（爆炸效果）
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 4 + 2;
        this.color = color;
        this.life = 1;
        this.decay = Math.random() * 0.03 + 0.02;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.radius *= 0.98;

        if (this.life <= 0 || this.radius < 0.5) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// 爆炸效果类
class Explosion {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.maxRadius = radius * 2;
        this.alpha = 1;
        this.markedForDeletion = false;
    }

    update() {
        this.radius += 2;
        this.alpha -= 0.05;

        if (this.alpha <= 0 || this.radius >= this.maxRadius) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 0, 0.8)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
    }
}

// 屏幕震动
let shakeIntensity = 0;

function shakeScreen() {
    shakeIntensity = 10;
}

function updateShake() {
    if (shakeIntensity > 0) {
        shakeIntensity *= 0.9;
        if (shakeIntensity < 0.5) {
            shakeIntensity = 0;
        }
    }
}

// 获取对象的碰撞半径
function getCollisionRadius(obj) {
    // 如果对象有 radius 属性，使用它
    if (obj.radius !== undefined && obj.radius !== null) {
        return obj.radius;
    }
    // 否则使用宽度的一半作为等效半径（矩形）
    if (obj.width) {
        return obj.width / 2;
    }
    // 默认返回0
    return 0;
}

// 碰撞检测（圆形碰撞）
function checkCollision(obj1, obj2) {
    const radius1 = getCollisionRadius(obj1);
    const radius2 = getCollisionRadius(obj2);
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius1 + radius2;
}

// 矩形碰撞检测
function checkRectCollision(rect1, rect2) {
    return rect1.x - rect1.width / 2 < rect2.x + rect2.width / 2 &&
           rect1.x + rect1.width / 2 > rect2.x - rect2.width / 2 &&
           rect1.y - rect1.height / 2 < rect2.y + rect2.height / 2 &&
           rect1.y + rect1.height / 2 > rect2.y - rect2.height / 2;
}

// 创建爆炸
function createExplosion(x, y, radius, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
    explosions.push(new Explosion(x, y, radius));
}

// 生成敌机
function spawnEnemy() {
    const spawnRate = Math.max(500, 1500 - gameState.level * 50); // 等级越高生成越快

    if (Math.random() < 1 / spawnRate * 60) {
        let type = 'normal';

        // Boss生成
        if (gameState.level === CONFIG.bossSpawnLevels[0]) {
            type = 'boss';
        } else if (gameState.level === CONFIG.bossSpawnLevels[1]) {
            type = 'boss';
        } else if (gameState.level === CONFIG.bossSpawnLevels[2]) {
            type = 'boss';
        } else {
            // 根据等级选择类型
            const rand = Math.random();
            if (gameState.level >= 10 && rand < 0.2) {
                type = 'fast';
            } else if (gameState.level >= 15 && rand < 0.3) {
                type = 'heavy';
            } else if (gameState.level >= 20 && rand < 0.05) {
                type = 'fast';
            }
        }

        enemies.push(new Enemy(type));
    }
}

// 生成道具
function spawnPowerup(x, y) {
    if (Math.random() < 0.3) { // 30%几率掉落道具
        const types = ['double', 'shield', 'laser', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerups.push(new Powerup(x, y, type));
    }
}

// 应用道具效果
function applyPowerup(powerup) {
    switch (powerup.type) {
        case 'double':
            if (player.bullets < 3) player.bullets++;
            break;
        case 'shield':
            player.hasShield = true;
            break;
        case 'laser':
            player.laserUpgrade = true;
            gameState.hasLaserUpgrade = true;
            break;
        case 'life':
            if (gameState.lives < 5) {
                gameState.lives++;
            }
            break;
    }
    gameState.score += powerup.scoreBonus;
    updateUI();
}

// 更新游戏状态
function update() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const now = Date.now();
    let deltaTime = 16; // 默认值
    if (lastTime) {
        deltaTime = now - lastTime;
    }
    lastTime = now;

    // 更新玩家
    player.update(deltaTime);

    // 更新子弹
    bullets.forEach(bullet => bullet.update());
    bullets = bullets.filter(bullet => !bullet.markedForDeletion);

    // 更新敌人子弹
    enemyBullets.forEach(bullet => bullet.update());
    enemyBullets = enemyBullets.filter(bullet => !bullet.markedForDeletion);

    // 更新敌机
    enemies.forEach(enemy => enemy.update());
    enemies = enemies.filter(enemy => !enemy.markedForDeletion);

    // 更新道具
    powerups.forEach(powerup => powerup.update());
    powerups = powerups.filter(powerup => !powerup.markedForDeletion);

    // 更新粒子
    particles.forEach(particle => particle.update());
    particles = particles.filter(particle => !particle.markedForDeletion);

    // 更新爆炸
    explosions.forEach(explosion => explosion.update());
    explosions = explosions.filter(explosion => !explosion.markedForDeletion);

    // 更新屏幕震动
    updateShake();

    // 生成敌机
    spawnEnemy();

    // 碰撞检测：玩家子弹 vs 敌机
    bullets.forEach(bullet => {
        enemies.forEach(enemy => {
            if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
                if (checkCollision(bullet, enemy)) {
                    bullet.markedForDeletion = true;
                    const destroyed = enemy.takeDamage(bullet.damage);

                    if (destroyed) {
                        createExplosion(enemy.x, enemy.y, enemy.width / 2, enemy.color);
                        gameState.score += enemy.score;
                        spawnPowerup(enemy.x, enemy.y);
                        updateUI();
                    }
                }
            }
        });
    });

    // 碰撞检测：敌人子弹 vs 玩家
    enemyBullets.forEach(bullet => {
        if (!bullet.markedForDeletion && !gameState.isGameOver) {
            if (checkCollision(bullet, player)) {
                bullet.markedForDeletion = true;
                if (!player.hasShield) {
                    player.takeDamage();
                } else {
                    player.hasShield = false;
                    createExplosion(bullet.x, bullet.y, 10, '#1e90ff');
                }
            }
        }
    });

    // 碰撞检测：敌机 vs 玩家
    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion && !gameState.isGameOver) {
            if (checkRectCollision(enemy, player)) {
                enemy.markedForDeletion = true;
                createExplosion(enemy.x, enemy.y, enemy.width / 2, enemy.color);
                if (!player.hasShield) {
                    player.takeDamage();
                } else {
                    player.hasShield = false;
                }
            }
        }
    });

    // 碰撞检测：玩家 vs 道具
    powerups.forEach(powerup => {
        if (!powerup.markedForDeletion) {
            if (checkCollision(powerup, player)) {
                powerup.markedForDeletion = true;
                applyPowerup(powerup);
                createExplosion(powerup.x, powerup.y, 10, powerup.color);
            }
        }
    });

    // 检查升级
    const newLevel = Math.floor(gameState.score / CONFIG.levelScoreThreshold) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        updateUI();
    }
}

// 渲染游戏
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 清空画布并应用震动效果
    ctx.save();
    if (shakeIntensity > 0) {
        ctx.translate(
            (Math.random() - 0.5) * shakeIntensity,
            (Math.random() - 0.5) * shakeIntensity
        );
    }

    // 清空画布
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-shakeIntensity, -shakeIntensity, canvas.width + shakeIntensity * 2, canvas.height + shakeIntensity * 2);

    // 绘制星星背景
    drawStars(ctx);

    // 绘制所有实体
    powerups.forEach(powerup => powerup.draw(ctx));
    particles.forEach(particle => particle.draw(ctx));
    bullets.forEach(bullet => bullet.draw(ctx));
    enemyBullets.forEach(bullet => bullet.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    player.draw(ctx);
    explosions.forEach(explosion => explosion.draw(ctx));

    // 绘制暂停提示
    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2);

        ctx.font = '24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('按 ESC 继续', canvas.width / 2, canvas.height / 2 + 50);
    }

    ctx.restore();
}

// 游戏主循环
function gameLoop() {
    if (!gameState.isRunning) return;

    update();
    render();

    requestAnimationFrame(gameLoop);
}

// 绘制星星背景
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * CONFIG.canvasWidth,
            y: Math.random() * CONFIG.canvasHeight,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

function drawStars(ctx) {
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if (star.y > CONFIG.canvasHeight) {
            star.y = 0;
            star.x = Math.random() * CONFIG.canvasWidth;
        }
    });
    ctx.globalAlpha = 1;
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('laserStatus').style.display = gameState.hasLaserUpgrade ? 'inline-block' : 'none';
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    gameState.isGameOver = true;

    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// 开始游戏
function startGame() {
    // 重置游戏状态
    gameState = {
        score: 0,
        level: 1,
        lives: 3,
        isRunning: true,
        isGameOver: false,
        isPaused: false,
        lastAutoFire: 0,
        hasLaserUpgrade: false,
    };

    // 初始化实体
    player = new Player(CONFIG.canvasWidth / 2, CONFIG.canvasHeight - 100);
    player.laserUpgrade = false; // 重置激光升级状态
    player.hasShield = false;    // 重置护盾状态
    bullets = [];
    enemyBullets = [];
    enemies = [];
    powerups = [];
    particles = [];
    explosions = [];
    stars = [];

    // 初始化星星
    initStars();

    // 重置屏幕震动
    shakeIntensity = 0;

    // 更新UI
    updateUI();

    // 隐藏界面
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');

    // 开始游戏循环
    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
}
