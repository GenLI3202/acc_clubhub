"""Generate local previews from the real renderers without sending email."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.email_templates import (  # noqa: E402
    confirmation_card,
    rescheduling_card,
    subscription_card,
)


def main() -> None:
    """Write the preview switcher and individual messages to docs/design."""
    root = Path(__file__).resolve().parents[2]
    output = root / "docs" / "design"
    output.mkdir(parents=True, exist_ok=True)
    data = {}
    for lang in ("zh", "en", "de"):
        shared = {
            "user_name": "林晨" if lang == "zh" else "Lin Chen",
            "event_title": "Isar 周末骑行" if lang == "zh" else "Isar Weekend Ride",
            "event_date": datetime(2030, 7, 7, 7, 30, tzinfo=timezone.utc),
            "event_location": "Deutsches Museum 门前广场"
            if lang == "zh"
            else "Square outside Deutsches Museum",
            "event_slug": "preview-ride",
            "frontend_url": "https://www.across-cc.de",
        }
        data[lang] = {
            "confirmation": confirmation_card(
                **shared,
                lang=lang,
                view_token="preview-token",
                wechat_qr_code=None,
                route_komoot_url="https://example.invalid/preview-route",
            ),
            "subscription": subscription_card(
                user_name=shared["user_name"],
                lang=lang,
                frontend_url=shared["frontend_url"],
                unsubscribe_token="preview-token",
            ),
        }
    data["en"]["reschedule"] = rescheduling_card(
        **shared,
        previous_event_date=datetime(2030, 7, 6, 7, tzinfo=timezone.utc),
        reason="weather",
    )
    for lang, messages in data.items():
        for kind, message in messages.items():
            (output / f"email_{kind}_{lang}.html").write_text(message["html"])
    markup = """<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACC 出发信息卡邮件预览</title><style>
*{box-sizing:border-box}body{margin:0;background:#eeefec;color:#1a1a1a;
font:15px/1.6 Arial,"Microsoft YaHei",sans-serif}main{max-width:1020px;
margin:auto;padding:32px 20px}h1{font-size:28px;margin:0 0 12px}
p{color:#666}.bar{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
button,select{font:inherit;padding:9px 12px;border:1px solid #ccc;
border-radius:4px;background:white;color:#222;cursor:pointer}
button[aria-pressed=true]{background:#c62828;color:white;border-color:#c62828}
button:focus-visible,select:focus-visible{outline:3px solid #c62828;outline-offset:2px}
.viewer{max-width:680px;margin:24px auto;background:white;border:1px solid #ddd}
.viewer.mobile{max-width:375px}.meta{padding:16px 20px;border-bottom:1px solid #ddd}
.meta p{font-size:12px;margin:0}iframe{width:100%;border:0;display:block}
pre{margin:0;padding:24px;white-space:pre-wrap;overflow-wrap:anywhere;
font:15px/1.7 Arial,sans-serif}[hidden]{display:none!important}
</style></head><body><main><h1>ACC · 出发信息卡</h1>
<p>三类邮件使用同一套正式模板。姓名、活动及日期均为演示数据；实际发送使用报名者姓名。
预览不会发送邮件，链接已禁用。</p>
<div class="bar"><button data-kind="confirmation">报名确认</button>
<button data-kind="subscription">订阅回执</button>
<button data-kind="reschedule">改期通知</button>
<label>语言 <select id="language"><option value="zh">中文</option>
<option value="en">English</option>
<option value="de">Deutsch</option></select></label></div>
<div class="bar"><button id="mobile">手机宽度</button>
<button id="images">隐藏图片</button>
<button id="plain">纯文本版本</button></div>
<p id="note">表格布局、内联样式和系统字体；不依赖外部字体、脚本或背景图。</p>
<section class="viewer" id="viewer"><div class="meta"><strong id="subject"></strong>
<p>ACC ClubHub &lt;noreply@events.across-cc.de&gt;</p></div>
<iframe title="实际邮件 HTML 预览" id="email" sandbox="allow-same-origin"></iframe>
<pre id="text" hidden></pre></section>
<p>已做浏览器和图片关闭时的检查。Gmail、Outlook、Apple Mail 收件箱实测仍待完成，

不能把网页预览等同于所有客户端渲染验证。书法是 PNG 图片；
姓名、时间、地点、署名均为文字。</p>
</main><script>
const data=__DATA__;
let kind='confirmation',hideImages=false,plain=false;
const frame=document.getElementById('email');
function resize(){
if(!plain)frame.style.height=frame.contentDocument.documentElement.scrollHeight+'px';
}
function render(){const language=document.getElementById('language');
if(kind==='reschedule')language.value='en';language.disabled=kind==='reschedule';
const msg=data[language.value][kind];
document.getElementById('subject').textContent=msg.subject;
document.getElementById('text').textContent=msg.text;
document.getElementById('text').hidden=!plain;frame.hidden=plain;
document.querySelectorAll('[data-kind]')
.forEach(b=>b.setAttribute('aria-pressed',b.dataset.kind===kind));
document.getElementById('images').setAttribute('aria-pressed',hideImages);
document.getElementById('plain').setAttribute('aria-pressed',plain);
document.getElementById('note').textContent=kind==='reschedule'?
'改期通知沿用后台英文发送：原因和原时间放进正文，卡片只列新出发时间与集合点。':
'表格布局、内联样式和系统字体；不依赖外部字体、脚本或背景图。';
frame.onload=()=>{const doc=frame.contentDocument;
doc.addEventListener('click',e=>e.preventDefault());
if(hideImages)doc.querySelectorAll('img').forEach(img=>img.style.display='none');
resize();doc.querySelectorAll('img').forEach(img=>img.addEventListener('load',resize));};
frame.style.height='1px';frame.srcdoc=msg.html;}
document.querySelectorAll('[data-kind]')
.forEach(b=>b.onclick=()=>{kind=b.dataset.kind;render()});
document.getElementById('language').onchange=render;
document.getElementById('images').onclick=()=>{hideImages=!hideImages;render()};
document.getElementById('plain').onclick=()=>{plain=!plain;render()};
document.getElementById('mobile').onclick=()=>{
const mobile=document.getElementById('viewer').classList.toggle('mobile');
document.getElementById('mobile').setAttribute('aria-pressed',mobile);render()};
render();
</script></body></html>"""
    markup = markup.replace(
        "__DATA__",
        json.dumps(data, ensure_ascii=False).replace("</", "<\\/"),
    )
    (output / "email_template_proposals.html").write_text(markup)
    print(output / "email_template_proposals.html")


if __name__ == "__main__":
    main()
