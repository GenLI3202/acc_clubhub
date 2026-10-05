import type { UniformCopy } from './types';

export const zh: UniformCopy = {
    meta: {
        title: 'ACC 2026 新队服订购',
        description:
            'Across Cycling Club Munich 2026 新队服开放订购：短袖上衣、背带短裤、马甲，截止 2026 年 10 月 25 日，慕尼黑自提。',
    },

    hero: {
        eyebrow: 'ACC 2026 队服',
        title: '2026 新队服',
        lede: '把阿尔卑斯的山脊，画进一件骑行服。',
        deadline: '订购截止 2026 年 10 月 25 日 23:59（慕尼黑时间）',
        cta: '开始选购',
        countdown: { label: '距订购截止还有', days: '天', hours: '时', minutes: '分', seconds: '秒' },
        timeline: [
            { when: '即日起至 10 月 25 日', what: '在线订购' },
            { when: '10 月 26 日至 10 月 31 日', what: 'ACC 统计订单并向 GRC 下单' },
            { when: '12 月中旬', what: '预计到货 · 慕尼黑自提' },
        ],
    },

    closed: {
        title: '订购已截止',
        body: '2026 新队服的订购已于 10 月 25 日 23:59（慕尼黑时间）截止。如有疑问，请联系工作人员。',
    },

    story: {
        eyebrow: '设计理念',
        title: '穿越无疆',
        paragraphs: [
            '把阿尔卑斯的山脊线，用国画写意的笔法画在骑行服上，这是 Across Mountains。',
            '一条蜿蜒的灰色公路，从象征公路与土地的黑色腰封出发，穿过晚霞红色的云层，伸进山林，这是 Across Paths，也是 Across Borders。',
            '若隐若现的橙红色水墨线，是秋日山林里的红叶，也是日出与日落时的云霞。',
        ],
        symbolsTitle: '右袖上的四枚符号',
        symbols: [
            { key: 'mountains', name: 'Across Mountains' },
            { key: 'paths', name: 'Across Paths' },
            { key: 'borders', name: 'Across Borders' },
            { key: 'across', name: 'Across' },
        ],
        detailsTitle: '细节里的含义',
        details: [
            { title: '椒盐卷饼', text: '背带短裤背面的小图标，代表慕尼黑。' },
            {
                title: '平安',
                text: '短裤腿上是手写的「平安」，上衣正面侧方腰腹处是红色的「平安」印章。',
            },
            {
                title: '慕城骑士',
                text: '上衣背兜上的印章。我们是活跃在慕尼黑的骑行群体。',
            },
            {
                title: 'ACROSS · PATHS · MOUNTAINS · BORDERS',
                text: '印在上衣的袖口。',
            },
        ],
        producedBy: '由 GRC 生产',
        close: '关闭',
        sampleTitle: '请注意：模特身上是样衣',
        sampleText:
            '模特身上穿的是样衣。收到样衣后，我们做了微调，尤其是 ACC Logo 的样式，请以设计图为准。所以你收到的衣服会和模特效果图略有出入。',
    },

    shop: {
        eyebrow: '选购',
        title: '选择款式、尺码和件数',
        intro: '三个款式单独售卖，没有套装优惠。先选会员身份和付款方式，再挑款式；选好后在「你的订单」里确认，然后去付款。',
        payTitle: '付款并提交订单',
        wechatTitle: '请在浏览器中打开本页',
        wechatBody:
            '微信内置浏览器通常无法登录 Google，第 3 步的截图上传会失败，订单也不会带到别的浏览器。请点右上角「···」→「在浏览器打开」后再下单。',
        products: {
            jersey: {
                name: '短袖上衣',
                tagline: '白底水墨山脊，红黑腰封',
                bullets: [
                    '3D 立体剪裁，高弹贴合',
                    '透气网眼袖，接触凉感，适合 25°C 以上的季节',
                    'YKK 拉链，下摆硅胶防滑织带',
                    '袖口无缝贴合工艺，减少摩擦',
                    '三个背兜',
                ],
                tip: '上衣弹性很大：例如 175 cm / 68 kg，追求紧身气动效果可以选 S（快选表建议 M）。',
            },
            bib: {
                name: '背带短裤',
                tagline: '全黑，丝网印「平安」与 GRC',
                bullets: [
                    'Spacer 双面布，弹力贴身，透气散热',
                    '4.5 cm 透气凹槽弹力肩带，后背轻量网眼面料',
                    'Ultra-Curve 53° 人体工学坐垫：3 mm 中层加 14 mm 高密度支撑；据 GRC 介绍，表面碳纤维材料可防止有害细菌滋生',
                    '脚口硅胶徽标防滑',
                ],
            },
            vest: {
                name: '马甲',
                tagline: '白 / 黑两色，同价自选',
                bullets: [
                    '前拉链；背部透气网布设两个开口，可以伸手探入内层骑行服的口袋取物',
                    '前胸 GRC | ACROSS CYCLING CLUB MUNICH，背面大 ACC 字标',
                ],
            },
        },
        vestColorLabel: '颜色',
        vestWhite: '白色',
        vestBlack: '黑色',
        vestNote: '白色款偏透，可见内层服装。',
        priceMember: '会员价',
        priceNonMember: '非会员价',
        sizeLabel: '尺码',
        selectSize: '请先选择版型和尺码',
        designButton: '查看设计理念',
        cutLabel: '版型',
        cutMen: '男款',
        cutWomen: '女款',
        cutHint: '男款、女款的尺码表不同，请对照下面的尺码表。',
        sizeGuideLink: '尺码表',
        qtyLabel: '件数',
        add: '加入订单',
        added: '已加入订单',
        sampleBadge: '样衣',
        imageAlt: {
            flat: '设计图',
            front: '模特正面',
            back: '模特背面',
            left: '模特左侧',
            right: '模特右侧',
            selfie: '模特自拍',
        },
    },

    summary: {
        title: '你的订单',
        empty: '还没有选购任何款式。选好尺码后点「加入订单」。',
        membershipLabel: 'ACC 会员身份',
        member: 'ACC 会员',
        nonMember: '非会员',
        membershipHint: '自行选择，我们会事后核对会员身份。',
        currencyLabel: '付款方式',
        currencyRmb: '支付宝 · 人民币',
        currencyEur: '银行转账 · 欧元',
        pieces: '{n} 件',
        subtotal: '商品小计',
        transfer: '转运费',
        transferHint: '从国内向 GRC 订购并转运到慕尼黑：1 件 {single}，2 件及以上每件 {each}。',
        total: '应付合计',
        remove: '移除',
        continue: '确认订单，去付款',
        continueDisabled: '请至少加入一件',
        chooseFirst: '请先选择会员身份和付款方式',
        extrasNote: '同一款式的第二个尺码（或另一种马甲颜色）会写进表单的「其他尺码」栏，由工作人员手动汇总。',
        fineprint: '定制商品：尺码选错不退不换 · 仅慕尼黑自提',
        termsLink: '订购须知',
        edit: '修改订单',
        steps: ['选购', '付款', '提交表单'],
        mobileBar: '查看订单',
    },

    pay: {
        title: '付款',
        intro: '请按下面的金额付款，并在备注里写上订单号。付款后，到下一步提交表单并上传付款截图。',
        amountDue: '应付金额',
        orderCode: '订单号',
        referenceHint: '请在转账的备注（Verwendungszweck）里填写订单号。',
        alipayTitle: '支付宝（人民币）',
        alipayScan:
            '用这部手机付款：长按二维码保存（或截图），打开支付宝「扫一扫」，点右上角「相册」选这张图。付款时点「添加备注」，填写订单号。',
        payee: '收款人：',
        sepaTitle: '银行转账（欧元，SEPA）',
        iban: 'IBAN',
        bic: 'BIC',
        holder: '户名',
        reference: '备注',
        copy: '复制',
        copied: '已复制',
        copyFailed: '无法自动复制，请长按文字复制',
        editWarning: '如果已经付款，请不要修改订单；需要改动请联系工作人员。',
        saveNote: '请截图保存订单号和金额。',
    },

    form: {
        title: '提交订单表单',
        intro: '订单信息会自动填入订购表单。请在表单里补充联系方式，并上传付款截图。',
        signInNote:
            '上传截图需要登录 Google 账号。无法登录时（例如在中国大陆），请把付款截图和订单号发给工作人员的微信或邮箱。',
        openNewTab: '打开订购表单',
        comingSoon: '订购表单正在准备中，请稍后再来。',
    },

    sizes: {
        title: '尺码表',
        intro: '按身高和体重选择。上衣和背带短裤通用同一张表，马甲另附成衣尺寸。',
        men: '男生尺码快选',
        women: '女生尺码快选',
        sharedNote: '上衣、背带短裤通用',
        vestNote: '马甲使用男生尺码快选表，不分男女。',
        heightWeight: '体重 kg ↓ / 身高 cm →',
        gapNote: '空白表示该身高体重组合没有推荐尺码。',
        finderTitle: '快速查询',
        sexMen: '男生',
        sexWomen: '女生',
        height: '身高 (cm)',
        weight: '体重 (kg)',
        result: '建议尺码：{size}',
        noResult: '表中没有对应的推荐，请联系工作人员咨询。',
        back: '返回选购',
        vestTableTitle: '马甲成衣尺寸（cm）',
        vestColumns: ['尺码', '胸围', '领口', '下摆', '前长', '后长'],
        tolerance: '手工测量，存在小误差。',
    },

    terms: {
        title: '订购须知',
        items: [
            '模特身上是样衣，成品以设计图为准（ACC Logo 样式有微调），实物与效果图会有出入。',
            '仅限质量问题可换，其余一律不退不换（包括尺码选错），请务必对照尺码表。',
            '仅限慕尼黑自提，不支持邮寄；具体取货方式在微信群里沟通。',
            '10 月 25 日 23:59（慕尼黑时间）截止，预计 10 月 31 日向 GRC 下单，12 月中旬到货。',
            '会员身份由你自行选择，我们会事后核对。',
            '个人信息与付款截图通过 Google 表单收集，仅用于本次队服订购及核对付款。',
        ],
    },

    contact: {
        title: '有问题？联系我们',
        body: '可以扫码添加工作人员的微信，也可以发邮件到 ACC 邮箱。',
        wechat: '微信：Ronnie',
        email: 'ACC 邮箱',
    },

    banner: {
        eyebrow: 'ACC 2026 队服',
        title: '2026 新队服，开放订购',
        body: '阿尔卑斯的山脊，画进一件骑行服。短袖上衣、背带短裤与马甲，慕尼黑自提。',
        cta: '查看并订购',
        deadline: '10 月 25 日 23:59 截止（慕尼黑时间）',
    },
};
