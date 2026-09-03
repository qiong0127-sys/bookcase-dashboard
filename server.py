"""Simple HTTP server with PM data persistence API and image proxy."""
import hashlib
import http.server
import json
import mimetypes
import os
import ssl
import sys
import threading
import urllib.parse
import urllib.request
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.log')
IMG_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img_cache')
os.makedirs(IMG_CACHE_DIR, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except:
        pass

HOST = '0.0.0.0'
PORT = 8080
DATA_FILE = 'pm-data.json'
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pm-backups')
os.makedirs(BACKUP_DIR, exist_ok=True)
MAX_BACKUPS = 20  # 保留最近20个备份，增强数据保护


def _backup_data_file():
    """保存 pm-data.json 到备份目录，保留最近 MAX_BACKUPS 个"""
    if not os.path.exists(DATA_FILE):
        return
    try:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'pm-data_{ts}.json'
        backup_path = os.path.join(BACKUP_DIR, backup_name)
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        # 清理旧备份，只保留最近 MAX_BACKUPS 个
        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.startswith('pm-data_') and f.endswith('.json')],
            reverse=True
        )
        for old in backups[MAX_BACKUPS:]:
            try:
                os.remove(os.path.join(BACKUP_DIR, old))
            except:
                pass
        log(f'✅ 备份已保存: {backup_name} (共{len(backups[:MAX_BACKUPS])}个备份)')
    except Exception as e:
        log(f'❌ 备份失败: {e}')


def _auto_git_commit(message=None):
    """自动提交到git版本控制"""
    try:
        import subprocess
        cwd = os.path.dirname(os.path.abspath(__file__))
        if not message:
            message = f'自动保存: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'

        # git add pm-data.json
        subprocess.run(['git', 'add', DATA_FILE], cwd=cwd, capture_output=True, timeout=5)
        # git commit
        result = subprocess.run(['git', 'commit', '-m', message], cwd=cwd, capture_output=True, timeout=5)
        if result.returncode == 0:
            log(f'✅ Git提交: {message}')
        else:
            # 没有变化也算正常
            pass
    except Exception as e:
        log(f'⚠️ Git提交失败: {e}')


def _daily_backup_check():
    """每日自动备份检查 - 如果今天还没备份，则创建一个每日备份"""
    try:
        today = datetime.now().strftime('%Y%m%d')
        daily_backup = os.path.join(BACKUP_DIR, f'pm-data_daily_{today}.json')

        if not os.path.exists(daily_backup):
            # 今天还没备份，创建每日备份
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    content = f.read()
                with open(daily_backup, 'w', encoding='utf-8') as f:
                    f.write(content)
                log(f'📅 每日备份已创建: pm-data_daily_{today}.json')

                # 清理旧的每日备份，只保留最近30天
                daily_backups = sorted([
                    f for f in os.listdir(BACKUP_DIR)
                    if f.startswith('pm-data_daily_') and f.endswith('.json')
                ], reverse=True)
                for old in daily_backups[30:]:
                    try:
                        os.remove(os.path.join(BACKUP_DIR, old))
                    except:
                        pass
    except Exception as e:
        log(f'⚠️ 每日备份失败: {e}')


def _start_daily_backup_scheduler():
    """启动每日备份调度器"""
    import threading
    import time

    def scheduler():
        while True:
            # 每小时检查一次是否需要备份
            _daily_backup_check()
            time.sleep(3600)  # 1小时

    thread = threading.Thread(target=scheduler, daemon=True)
    thread.start()
    log('📅 每日自动备份调度器已启动（每小时检查，保留30天）')


def _count_items(data):
    """计算项目数据中的总条目数（项目数+进度条目数）"""
    if not isinstance(data, list):
        return 0
    total = len(data)
    for p in data:
        total += len(p.get('items', []))
    return total


class PMHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/pm-data':
            self._handle_get_data()
        elif parsed.path == '/api/pm-backups':
            self._handle_list_backups()
        elif parsed.path.startswith('/api/pm-restore/'):
            self._handle_restore_backup(parsed.path.split('/')[-1])
        elif parsed.path == '/bookcase_dashboard.html':
            # 仅允许从 pm-kanban.html 的 iframe 加载
            referer = self.headers.get('Referer', '')
            if 'pm-kanban.html' in referer:
                super().do_GET()
            else:
                self.send_response(403)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write('<h1 style="font-family:sans-serif">403 Forbidden</h1><p style="font-family:sans-serif">该书柜看板仅限通过工作看板访问</p>'.encode('utf-8'))
        elif parsed.path in ('/bigbrand_board.html', '/bigbrand_dashboard.html'):
            self.send_response(403)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write('<h1 style="font-family:sans-serif">403 Forbidden</h1><p style="font-family:sans-serif">该品牌看板仅限通过工作看板访问</p>'.encode('utf-8'))
        elif parsed.path == '/api/img-proxy':
            self._handle_img_proxy(parsed)
        else:
            super().do_GET()

    def end_headers(self):
        # Add no-cache for JSON and HTML files to prevent stale data
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/pm-data':
            self._handle_post_data()
        else:
            self.send_error(405)

    def _handle_get_data(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'[]')

    def _handle_post_data(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            new_data = json.loads(body)

            # 数据保护：检查新数据是否比现有数据少很多（可能是过期数据覆盖）
            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        current_data = json.load(f)
                    current_count = _count_items(current_data)
                    new_count = _count_items(new_data)
                    # 如果新数据比现有数据少了超过30%，拒绝并返回警告
                    if current_count > 0 and new_count < current_count * 0.7:
                        log(f'拒绝覆盖: 现有{current_count}条, 客户端仅{new_count}条 (降幅{(1-new_count/current_count)*100:.0f}%)')
                        self.send_response(409)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            'ok': False,
                            'conflict': True,
                            'error': f'数据保护: 您的数据({new_count}条)比服务器({current_count}条)少很多，可能已过期。请刷新页面获取最新数据后再编辑。'
                        }).encode('utf-8'))
                        return
                except Exception as e:
                    log(f'数据对比失败: {e}')

            # 保存前自动备份现有数据
            _backup_data_file()

            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(new_data, f, ensure_ascii=False, indent=2)
            item_count = _count_items(new_data)
            log(f'✅ 数据已保存: {len(new_data)}个项目, {item_count}条总计, 数据大小: {len(body)}字节')

            # 自动提交到git
            _auto_git_commit(f'数据更新: {len(new_data)}个项目, {_count_items(new_data)}条进度')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': 'JSON格式错误'}).encode('utf-8'))
        except Exception as e:
            log(f'保存失败: {e}')
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': False, 'error': str(e)}).encode('utf-8'))

    def _handle_list_backups(self):
        """列出所有可用的备份"""
        try:
            backups = sorted(
                [f for f in os.listdir(BACKUP_DIR) if f.startswith('pm-data_') and f.endswith('.json')],
                reverse=True
            )
            backup_list = []
            for name in backups[:MAX_BACKUPS]:
                path = os.path.join(BACKUP_DIR, name)
                stat = os.stat(path)
                backup_list.append({
                    'name': name,
                    'size': stat.st_size,
                    'time': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'backups': backup_list}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def _handle_restore_backup(self, backup_name):
        """从备份恢复数据"""
        if not backup_name or '..' in backup_name or not backup_name.startswith('pm-data_'):
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '无效的备份文件名'}).encode('utf-8'))
            return

        backup_path = os.path.join(BACKUP_DIR, backup_name)
        if not os.path.exists(backup_path):
            self.send_response(404)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '备份文件不存在'}).encode('utf-8'))
            return

        try:
            # 先备份当前数据
            _backup_data_file()

            # 从备份恢复
            with open(backup_path, 'r', encoding='utf-8') as f:
                backup_data = f.read()
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                f.write(backup_data)

            data = json.loads(backup_data)
            log(f'✅ 已从备份恢复: {backup_name} ({len(data)}个项目)')
            _auto_git_commit(f'从备份恢复: {backup_name}')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'restored': len(data)}).encode('utf-8'))
        except Exception as e:
            log(f'❌ 恢复失败: {e}')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _handle_img_proxy(self, parsed):
        """Proxy external images with local caching."""
        qs = urllib.parse.parse_qs(parsed.query)
        url = qs.get('url', [''])[0]
        if not url:
            self.send_error(400, 'Missing url parameter')
            return
        # Only allow known image domains
        allowed = ('pbimgs.com', 'weimgs.com', 'restorationhardware.com',
                   'scene7.com', 'hookerfurnishings.com', 'potterybarn.com',
                   'williams-sonoma.com', 'westelm.com', 'cb2.com', 'crateandbarrel.com')
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
        except:
            self.send_error(400, 'Invalid url')
            return
        if not any(a in domain for a in allowed):
            self.send_error(403, 'Domain not allowed')
            return
        # Cache key: hash of URL
        key = hashlib.md5(url.encode()).hexdigest()
        ext = os.path.splitext(urlparse(url).path)[1] or '.jpg'
        if ext not in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'):
            ext = '.jpg'
        cache_path = os.path.join(IMG_CACHE_DIR, key + ext)
        # Serve from cache if exists
        if os.path.exists(cache_path):
            mime, _ = mimetypes.guess_type(cache_path)
            if not mime:
                mime = 'image/jpeg'
            with open(cache_path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            return
        # Fetch and cache in background, or sync if not cached
        # Try to fetch with retry
        max_retries = 2
        last_error = None
        for attempt in range(max_retries):
            try:
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': url,
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                })
                with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
                    data = resp.read()
                    ctype = resp.headers.get('Content-Type', 'image/jpeg')
                # Save to cache
                try:
                    with open(cache_path, 'wb') as f:
                        f.write(data)
                except:
                    pass
                self.send_response(200)
                self.send_header('Content-Type', ctype)
                self.send_header('Cache-Control', 'public, max-age=86400')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
                return
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    import time
                    time.sleep(1)  # Wait before retry
                continue

        # All retries failed
        log(f'img-proxy error: {last_error} for {url[:80]}')
        # Return a placeholder SVG instead of 502
        placeholder = b'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#f0f0f0"/><text x="40" y="45" text-anchor="middle" font-size="12" fill="#999">No Image</text></svg>'
        self.send_response(200)
        self.send_header('Content-Type', 'image/svg+xml')
        self.send_header('Cache-Control', 'public, max-age=3600')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(placeholder)


if __name__ == '__main__':
    server = http.server.HTTPServer((HOST, PORT), PMHandler)
    log(f'Server started on {HOST}:{PORT}')

    # 启动每日自动备份
    _start_daily_backup_scheduler()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log('Server stopped by user')
        server.shutdown()
    except Exception as e:
        log(f'Server crashed: {e}')
        raise
