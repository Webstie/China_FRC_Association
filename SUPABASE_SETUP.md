# Supabase 邮箱密码登录与统计配置

当前前端使用 Supabase Auth 的邮箱 + 密码登录。静态站仍然可以放在 GitHub Pages；用户、页面停留时间和后台数据保存在 Supabase Postgres。

## 1. 创建项目并填配置

在 Supabase 项目里找到：

```text
Project Settings -> API
```

复制：

```text
Project URL
anon public key
```

填进 `supabase-config.js`：

```js
window.FRC_SUPABASE_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "你的 anon public key",
  siteId: "frc-wiki-cn"
};
```

`anon public key` 可以放在前端；不要把 `service_role` key 放进前端。

## 2. 启用 Email Auth

Supabase 后台：

```text
Authentication -> Providers -> Email
```

启用 Email provider。

当前页面不使用验证码输入，也不使用 magic-link 作为主要登录方式。用户输入邮箱和密码：

```text
注册 -> 用户点击确认邮件后回到登录框
登录 -> 使用邮箱 + 密码
```

建议保留 email confirmation。当前前端会在确认邮件回跳后自动退出确认 session，并提示用户用邮箱 + 密码登录。

如果某个邮箱之前用 Magic Link 创建过账号，它可能还没有密码。此时在登录页点：

```text
设置 / 重置密码
```

通过邮件设置新密码后，再用邮箱 + 密码登录。

如果你想改确认邮件内容，可以打开：

```text
Authentication -> Email Templates -> Magic Link
```

模板里需要保留确认链接变量。默认模板通常已经包含，不需要手动修改。


## 3. 创建数据库表和权限

打开：

```text
SQL Editor
```

运行 `supabase-schema.sql` 里的全部 SQL。

它会创建：

```text
profiles      用户邮箱和管理员标记
page_events   页面访问和停留时间
```

## 4. 设置管理员

先用邮箱登录一次，让系统创建 `profiles` 记录。

然后在 SQL Editor 里把你的账号设为管理员：

```sql
update public.profiles
set is_admin = true
where email = 'you@example.com';
```

之后打开：

```text
admin.html
```

就能查看用户列表和页面统计。

## 5. 注意

- Supabase 国际服务在中国大陆访问可能不如国内云稳定。
- 邮箱和页面停留时间属于个人信息和用户行为数据，登录页已经有简短告知；正式公开前建议补充隐私说明。
- GitHub Pages 仍然是静态公开托管，前端登录门禁不能保护真正机密的 HTML 文件。
