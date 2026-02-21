# Установка Self-Hosted Runner на Windows

> Self-hosted runner — это агент GitHub Actions, который работает на ВАШЕМ компьютере.
> Он получает задания от GitHub и выполняет их локально.

---

## Зачем нужен?

GitHub предоставляет облачные runners (`ubuntu-latest`, `windows-latest`),
но они НЕ имеют доступа к вашей локальной машине.

Для **локального деплоя** (docker compose up на вашем ПК) нужен runner,
который работает **на вашем ПК**.

---

## Шаг 1: Создать runner в GitHub

1. Откройте репозиторий в GitHub
2. Settings → Actions → Runners → **New self-hosted runner**
3. Выберите:
   - OS: **Windows**
   - Architecture: **x64**

GitHub покажет команды для установки — используйте их в следующем шаге.

---

## Шаг 2: Скачать и установить

Откройте **PowerShell от администратора** и выполните:

```powershell
# 1. Создайте папку для runner
mkdir C:\actions-runner
cd C:\actions-runner

# 2. Скачайте runner (GitHub покажет актуальную ссылку)
# Замените URL на тот, что показал GitHub!
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-win-x64-2.321.0.zip -OutFile actions-runner.zip

# 3. Распакуйте
Expand-Archive -Path actions-runner.zip -DestinationPath .

# 4. Удалите архив
Remove-Item actions-runner.zip
```

---

## Шаг 3: Настроить runner

```powershell
# Из папки C:\actions-runner:
.\config.cmd
```

Вам зададут вопросы:

| Вопрос | Ответ |
|--------|-------|
| Enter the URL of the runner registration | `https://github.com/<owner>/<repo>` |
| Enter the authentication token | Токен со страницы GitHub (шаг 1) |
| Enter the name of the runner | `my-pc` (или любое имя) |
| Enter any additional labels | **`local-deploy`** ← ОБЯЗАТЕЛЬНО! |
| Enter name of work folder | `_work` (по умолчанию) |

> **Важно:** добавьте label `local-deploy` — именно его использует workflow `deploy-local.yml`.

---

## Шаг 4: Запустить как Windows-сервис

```powershell
# Установить как сервис (требует админ-прав)
.\svc.cmd install

# Запустить сервис
.\svc.cmd start

# Проверить статус
.\svc.cmd status
```

**Сервис будет:**
- Автоматически запускаться при загрузке Windows
- Работать в фоне
- Автоматически переподключаться к GitHub

### Альтернатива: запуск вручную (без сервиса)
```powershell
# Из папки C:\actions-runner:
.\run.cmd
# Runner работает пока открыта консоль
```

---

## Шаг 5: Проверить что runner онлайн

1. GitHub → репозиторий → Settings → Actions → Runners
2. Ваш runner должен показывать **🟢 Idle** (зелёный)

### Через PowerShell:
```powershell
# Проверить сервис
Get-Service actions.runner.*

# Должно показать:
# Status: Running
# Name:   actions.runner.<owner>-<repo>.<runner-name>
```

---

## Labels runner'а

Workflow `deploy-local.yml` использует:
```yaml
runs-on: [self-hosted, Windows, local-deploy]
```

Это значит runner должен иметь ВСЕ три labels:
- **`self-hosted`** — добавляется автоматически
- **`Windows`** — добавляется автоматически (определяется по ОС)
- **`local-deploy`** — ВРУЧНУЮ при регистрации (шаг 3)

### Как добавить label после регистрации:
GitHub → Settings → Actions → Runners → ваш runner → Edit → Labels → Add

---

## Требования к машине

| Требование | Минимум |
|-----------|---------|
| ОС | Windows 10/11 |
| Docker Desktop | Установлен и запущен |
| RAM | 8 GB (4 GB свободно) |
| Disk | 5 GB свободно |
| Сеть | Интернет (для pull images из GHCR) |

---

## GHCR Login для Private Repo (опционально)

Для **public** репозитория `GITHUB_TOKEN` в workflow достаточен для pull images.

Для **private** репозитория может потребоваться Personal Access Token (PAT):

### Создание PAT
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. **New token**:
   - Name: `ghcr-pull`
   - Expiration: 90 days
   - Repository access: Only select repositories → ваш репо
   - Permissions:
     - Packages: **Read** (ТОЛЬКО read, не write)
3. Скопируйте токен

### Добавление как Secret
1. GitHub → репозиторий → Settings → Secrets and variables → Actions
2. **New repository secret**:
   - Name: `GHCR_PAT`
   - Value: ваш PAT
3. Workflow автоматически использует `GHCR_PAT` если он задан (иначе GITHUB_TOKEN)

### Почему GITHUB_TOKEN может не работать:
- `GITHUB_TOKEN` в workflow имеет scope ТОЛЬКО текущего workflow run
- На self-hosted runner при `docker login` нужен токен, который работает вне workflow context
- Для public repo это не проблема (images public)
- Для private repo — GHCR_PAT решает проблему

---

## Управление runner'ом

```powershell
# Перезапустить
Restart-Service actions.runner.*

# Остановить
Stop-Service actions.runner.*

# Удалить runner
cd C:\actions-runner
.\svc.cmd stop
.\svc.cmd uninstall
.\config.cmd remove --token <TOKEN_FROM_GITHUB>
```

---

## Troubleshooting

### Runner показывает Offline в GitHub
```powershell
# Проверить сервис
Get-Service actions.runner.* | Format-List Name, Status, StartType

# Проверить логи runner'а
Get-Content C:\actions-runner\_diag\Runner_*.log -Tail 50
```

### Docker не найден в runner
Runner запускается как Local System или Network Service.
Docker Desktop должен быть настроен для **"Use the WSL 2 based engine"**.

```powershell
# Проверить что docker доступен
docker info
```

### Permission denied при docker compose
```powershell
# Убедиться что пользователь runner'а добавлен в группу docker-users
net localgroup docker-users /add <USERNAME>
```
