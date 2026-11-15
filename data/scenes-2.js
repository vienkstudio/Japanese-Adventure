window.SCENES = window.SCENES || [];
/* data/scenes-2.js — 日語內容編輯 B：問路、車站、飯店、神社、機場、緊急求助 */
SCENES.push(
// ───────────── 問路 Lv2 ─────────────
{
  id: 'directions', name: '問路', icon: '🧭', color: '#3b82c4',
  unlockLevel: 2,
  desc: '迷路了別慌！學會「〜はどこですか」，走到哪都問得到路。',
  tips: [
    '問路前先說「すみません」（不好意思）叫住對方，日本人通常會很熱心地帶路，甚至直接陪你走過去。',
    '找不到路時可以去「交番」（派出所），警察會幫忙指路，這在日本非常普遍。',
    '日本很多街道沒有路名，指路時常用「信號（紅綠燈）」「角（轉角）」「コンビニ」當地標，例如「二つ目の信号を右」＝第二個紅綠燈右轉。'
  ],
  vocab: [
    { jp:'駅', kana:'えき', romaji:'eki', zh:'車站', hint:'諧音：欸奇', emoji:'🚉' },
    { jp:'トイレ', kana:'といれ', romaji:'toire', zh:'廁所', hint:'諧音：拖伊勒', emoji:'🚻' },
    { jp:'右', kana:'みぎ', romaji:'migi', zh:'右邊', hint:'諧音：咪基', emoji:'➡️' },
    { jp:'左', kana:'ひだり', romaji:'hidari', zh:'左邊', hint:'諧音：嘻搭哩', emoji:'⬅️' },
    { jp:'まっすぐ', kana:'まっすぐ', romaji:'massugu', zh:'直直地、直走', hint:'諧音：媽素估', emoji:'⬆️' },
    { jp:'角', kana:'かど', romaji:'kado', zh:'轉角', hint:'諧音：咖兜', emoji:'↪️' },
    { jp:'信号', kana:'しんごう', romaji:'shingou', zh:'紅綠燈', hint:'諧音：心狗', emoji:'🚦' },
    { jp:'近く', kana:'ちかく', romaji:'chikaku', zh:'附近', hint:'諧音：七咖哭', emoji:'📍' },
    { jp:'遠い', kana:'とおい', romaji:'tooi', zh:'遠的', hint:'諧音：偷歐伊', emoji:'🏞️' },
    { jp:'地図', kana:'ちず', romaji:'chizu', zh:'地圖', hint:'諧音：七滋', emoji:'🗺️' },
    { jp:'交番', kana:'こうばん', romaji:'kouban', zh:'派出所', hint:'諧音：口邦', emoji:'👮' },
    { jp:'道', kana:'みち', romaji:'michi', zh:'道路', hint:'諧音：咪七', emoji:'🛣️' },
    { jp:'橋', kana:'はし', romaji:'hashi', zh:'橋', hint:'諧音：哈西', emoji:'🌉' }
  ],
  phrases: [
    { jp:'すみません、駅はどこですか', kana:'すみません、えきはどこですか', romaji:'sumimasen, eki wa doko desu ka', zh:'不好意思，車站在哪裡？', hint:'諧音：蘇咪媽線，欸奇哇兜扣爹斯卡', use:'叫住路人問地點時' },
    { jp:'トイレはどこですか', kana:'といれはどこですか', romaji:'toire wa doko desu ka', zh:'廁所在哪裡？', hint:'諧音：拖伊勒哇兜扣爹斯卡', use:'急著找廁所時' },
    { jp:'東京タワーまで行きたいです', kana:'とうきょうたわーまでいきたいです', romaji:'toukyou tawaa made ikitai desu', zh:'我想去東京鐵塔', hint:'諧音：偷叫他哇媽爹 伊奇他伊爹斯', use:'把「東京タワー」換成任何目的地' },
    { jp:'ここから遠いですか', kana:'ここからとおいですか', romaji:'koko kara tooi desu ka', zh:'離這裡遠嗎？', hint:'諧音：扣扣咖拉 偷歐伊爹斯卡', use:'判斷要走路還是搭車' },
    { jp:'歩いて何分ですか', kana:'あるいてなんぷんですか', romaji:'aruite nanpun desu ka', zh:'走路要幾分鐘？', hint:'諧音：阿嚕伊貼 南噗恩爹斯卡', use:'問步行時間' },
    { jp:'地図で教えてください', kana:'ちずでおしえてください', romaji:'chizu de oshiete kudasai', zh:'請用地圖告訴我', hint:'諧音：七滋爹 歐西欸貼哭搭賽', use:'聽不懂時拿出手機地圖' },
    { jp:'もう一度お願いします', kana:'もういちどおねがいします', romaji:'mou ichido onegai shimasu', zh:'麻煩再說一次', hint:'諧音：摸伊七兜 歐內嘎伊西媽斯', use:'沒聽清楚時' }
  ],
  dialogues: [
    { title:'找車站', steps:[
      { speaker:'路人', emoji:'🧑', jp:'はい、何ですか？', kana:'はい、なんですか', romaji:'hai, nan desu ka', zh:'是，有什麼事嗎？',
        choices:[
          { jp:'すみません、駅はどこですか', kana:'すみません、えきはどこですか', zh:'不好意思，車站在哪裡？', correct:true, feedback:'「〜はどこですか」是問路最基本的句型' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員迎接客人說的，不是問路' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待（吃飽了）', correct:false, feedback:'這是吃完飯才說的' }
        ] },
      { speaker:'路人', emoji:'🧑', jp:'この道をまっすぐ行って、二つ目の信号を右です。', kana:'このみちをまっすぐいって、ふたつめのしんごうをみぎです', romaji:'kono michi o massugu itte, futatsume no shingou o migi desu', zh:'這條路直走，第二個紅綠燈右轉。',
        choices:[
          { jp:'右ですね。ありがとうございます', kana:'みぎですね。ありがとうございます', zh:'右邊對吧，謝謝', correct:true, feedback:'複述「右」確認方向，很好的習慣' },
          { jp:'もう一度お願いします', kana:'もういちどおねがいします', zh:'麻煩再說一次', correct:true, feedback:'沒聽懂就請對方再說一次，完全OK' },
          { jp:'左ですね', kana:'ひだりですね', zh:'左邊對吧', correct:false, feedback:'對方說的是「みぎ（右）」，「ひだり」是左' }
        ] },
      { speaker:'路人', emoji:'🧑', jp:'歩いて5分くらいですよ。', kana:'あるいてごふんくらいですよ', romaji:'aruite gofun kurai desu yo', zh:'走路大約5分鐘喔。',
        choices:[
          { jp:'近いですね。助かります', kana:'ちかいですね。たすかります', zh:'好近，幫了大忙', correct:true, feedback:'「助かります」表達「你幫了我」的感謝' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'這是在店裡結帳用的' },
          { jp:'おやすみなさい', kana:'おやすみなさい', zh:'晚安', correct:false, feedback:'這是睡前道晚安，不是道別或道謝' }
        ] }
    ]},
    { title:'去東京鐵塔', steps:[
      { speaker:'路人', emoji:'👩', jp:'どうしましたか？', kana:'どうしましたか', romaji:'dou shimashita ka', zh:'怎麼了嗎？',
        choices:[
          { jp:'東京タワーまで行きたいです', kana:'とうきょうたわーまでいきたいです', zh:'我想去東京鐵塔', correct:true, feedback:'「〜まで行きたいです」直接說出目的地' },
          { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', zh:'麻煩辦入住', correct:false, feedback:'這是在飯店櫃台說的' },
          { jp:'これください', kana:'これください', zh:'我要這個', correct:false, feedback:'這是買東西時說的' }
        ] },
      { speaker:'路人', emoji:'👩', jp:'ここからだと、ちょっと遠いですね。電車のほうがいいですよ。', kana:'ここからだと、ちょっととおいですね。でんしゃのほうがいいですよ', romaji:'koko kara da to, chotto tooi desu ne. densha no hou ga ii desu yo', zh:'從這裡的話有點遠耶，搭電車比較好喔。',
        choices:[
          { jp:'じゃあ、駅はどこですか', kana:'じゃあ、えきはどこですか', zh:'那車站在哪裡？', correct:true, feedback:'順著建議問車站位置，很自然' },
          { jp:'はじめまして', kana:'はじめまして', zh:'初次見面', correct:false, feedback:'這是自我介紹時用的' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的' }
        ] },
      { speaker:'路人', emoji:'👩', jp:'あそこの角を左に曲がると、すぐ駅です。', kana:'あそこのかどをひだりにまがると、すぐえきです', romaji:'asoko no kado o hidari ni magaru to, sugu eki desu', zh:'在那邊的轉角左轉，馬上就是車站。',
        choices:[
          { jp:'左の角ですね。ありがとうございました', kana:'ひだりのかどですね。ありがとうございました', zh:'左邊的轉角對吧，謝謝您', correct:true, feedback:'確認方向＋道謝，完美' },
          { jp:'地図で教えてください', kana:'ちずでおしえてください', zh:'請用地圖告訴我', correct:true, feedback:'不確定就拿出地圖請對方指，很實用' },
          { jp:'右の角ですね', kana:'みぎのかどですね', zh:'右邊的轉角對吧', correct:false, feedback:'對方說「ひだり（左）」喔' }
        ] }
    ]}
  ]
},
// ───────────── 車站・電車 Lv3 ─────────────
{
  id: 'station', name: '車站・電車', icon: '🚃', color: '#16a085',
  unlockLevel: 3,
  desc: '搞懂月台、轉乘和 IC 卡，日本電車網就是你的任意門。',
  tips: [
    'Suica、PASMO、ICOCA 等 IC 卡全國大多通用，進出站「嗶」一下就好，還能在便利商店付款；餘額不足時用「精算機」或「チャージ機」加值。',
    '電車內講電話被視為不禮貌，手機要調成「マナーモード」（靜音）；上下班尖峰時段部分路線有「女性専用車両」。',
    '「各駅停車」每站都停，「快速」「急行」「特急」會跳站，搭之前先確認要去的站有沒有停！'
  ],
  vocab: [
    { jp:'切符', kana:'きっぷ', romaji:'kippu', zh:'車票', hint:'諧音：奇噗', emoji:'🎫' },
    { jp:'改札', kana:'かいさつ', romaji:'kaisatsu', zh:'剪票口', hint:'諧音：咖伊沙此', emoji:'🚧' },
    { jp:'ホーム', kana:'ほーむ', romaji:'hoomu', zh:'月台', hint:'諧音：齁～母', emoji:'🚉' },
    { jp:'乗り換え', kana:'のりかえ', romaji:'norikae', zh:'轉乘', hint:'諧音：諾哩卡欸', emoji:'🔁' },
    { jp:'何番線', kana:'なんばんせん', romaji:'nanbansen', zh:'幾號月台', hint:'諧音：南邦線', emoji:'🔢' },
    { jp:'電車', kana:'でんしゃ', romaji:'densha', zh:'電車', hint:'諧音：電蝦', emoji:'🚃' },
    { jp:'地下鉄', kana:'ちかてつ', romaji:'chikatetsu', zh:'地鐵', hint:'諧音：七咖貼此', emoji:'🚇' },
    { jp:'新幹線', kana:'しんかんせん', romaji:'shinkansen', zh:'新幹線', hint:'諧音：心看線', emoji:'🚄' },
    { jp:'各駅停車', kana:'かくえきていしゃ', romaji:'kakueki teisha', zh:'各站停車', hint:'諧音：咖哭欸奇 貼蝦', emoji:'🐢' },
    { jp:'快速', kana:'かいそく', romaji:'kaisoku', zh:'快速車', hint:'諧音：凱搜哭', emoji:'💨' },
    { jp:'出口', kana:'でぐち', romaji:'deguchi', zh:'出口', hint:'諧音：爹古七', emoji:'🚪' },
    { jp:'終電', kana:'しゅうでん', romaji:'shuuden', zh:'末班車', hint:'諧音：咻電', emoji:'🌙' },
    { jp:'指定席', kana:'していせき', romaji:'shiteiseki', zh:'對號座', hint:'諧音：西貼誰奇', emoji:'💺' },
    { jp:'自由席', kana:'じゆうせき', romaji:'jiyuuseki', zh:'自由座', hint:'諧音：基尤誰奇', emoji:'🪑' },
    { jp:'チャージ', kana:'ちゃーじ', romaji:'chaaji', zh:'加值', hint:'諧音：洽～基', emoji:'💳' }
  ],
  phrases: [
    { jp:'新宿まで行きたいです', kana:'しんじゅくまでいきたいです', romaji:'shinjuku made ikitai desu', zh:'我想到新宿', hint:'諧音：心啾哭媽爹 伊奇他伊爹斯', use:'跟站務員說目的地' },
    { jp:'何番線ですか', kana:'なんばんせんですか', romaji:'nanbansen desu ka', zh:'是幾號月台？', hint:'諧音：南邦線爹斯卡', use:'找月台時' },
    { jp:'この電車は渋谷に止まりますか', kana:'このでんしゃはしぶやにとまりますか', romaji:'kono densha wa shibuya ni tomarimasu ka', zh:'這班車有停澀谷嗎？', hint:'諧音：扣諾電蝦哇 西布呀你 偷媽哩媽斯卡', use:'上車前確認' },
    { jp:'乗り換えはどこですか', kana:'のりかえはどこですか', romaji:'norikae wa doko desu ka', zh:'轉乘在哪裡？', hint:'諧音：諾哩卡欸哇 兜扣爹斯卡', use:'在大站換線時' },
    { jp:'切符はどこで買えますか', kana:'きっぷはどこでかえますか', romaji:'kippu wa doko de kaemasu ka', zh:'車票在哪裡買？', hint:'諧音：奇噗哇 兜扣爹 卡欸媽斯卡', use:'找售票機或窗口' },
    { jp:'すみません、降ります', kana:'すみません、おります', romaji:'sumimasen, orimasu', zh:'不好意思，我要下車', hint:'諧音：蘇咪媽線 歐哩媽斯', use:'車廂擁擠要擠出去時' },
    { jp:'東口はどちらですか', kana:'ひがしぐちはどちらですか', romaji:'higashiguchi wa dochira desu ka', zh:'東口在哪個方向？', hint:'諧音：嘻嘎西古七哇 兜七拉爹斯卡', use:'大站出口很多時' }
  ],
  dialogues: [
    { title:'找月台', steps:[
      { speaker:'站務員', emoji:'👨‍✈️', jp:'どうしましたか？', kana:'どうしましたか', romaji:'dou shimashita ka', zh:'怎麼了嗎？',
        choices:[
          { jp:'新宿まで行きたいです', kana:'しんじゅくまでいきたいです', zh:'我想到新宿', correct:true, feedback:'直接說目的地，站務員就會告訴你怎麼搭' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'這是在餐廳結帳用的' },
          { jp:'温めてください', kana:'あたためてください', zh:'請幫我加熱', correct:false, feedback:'這是在便利商店買便當時說的' }
        ] },
      { speaker:'站務員', emoji:'👨‍✈️', jp:'新宿なら、山手線の3番線です。', kana:'しんじゅくなら、やまのてせんのさんばんせんです', romaji:'shinjuku nara, yamanotesen no sanbansen desu', zh:'新宿的話，是山手線3號月台。',
        choices:[
          { jp:'3番線ですね。ありがとうございます', kana:'さんばんせんですね。ありがとうございます', zh:'3號月台對吧，謝謝', correct:true, feedback:'複述月台號碼確認，最保險' },
          { jp:'もう一度お願いします', kana:'もういちどおねがいします', zh:'麻煩再說一次', correct:true, feedback:'沒聽清楚就請對方再說一次' },
          { jp:'13番線ですね', kana:'じゅうさんばんせんですね', zh:'13號月台對吧', correct:false, feedback:'對方說「さん（3）」，不是「じゅうさん（13）」' }
        ] },
      { speaker:'站務員', emoji:'👨‍✈️', jp:'ICカードはお持ちですか？', kana:'あいしーかーどはおもちですか', romaji:'aishii kaado wa omochi desu ka', zh:'您有 IC 卡嗎？',
        choices:[
          { jp:'はい、Suicaがあります', kana:'はい、すいかがあります', zh:'有，我有 Suica', correct:true, feedback:'有 IC 卡直接嗶卡進站就好' },
          { jp:'いいえ、切符を買いたいです', kana:'いいえ、きっぷをかいたいです', zh:'沒有，我想買車票', correct:true, feedback:'沒卡就買單程票，也是正確回答' },
          { jp:'はい、パスポートです', kana:'はい、ぱすぽーとです', zh:'是，這是護照', correct:false, feedback:'搭電車不需要護照，那是機場或飯店用的' }
        ] }
    ]},
    { title:'下車與出站', steps:[
      { speaker:'車內廣播', emoji:'📢', jp:'次は渋谷、渋谷です。', kana:'つぎはしぶや、しぶやです', romaji:'tsugi wa shibuya, shibuya desu', zh:'下一站澀谷，澀谷。',
        choices:[
          { jp:'すみません、降ります', kana:'すみません、おります', zh:'不好意思，我要下車', correct:true, feedback:'車廂擠時說這句，大家會讓路給你' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員說的話' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的，而且電車上通常不吃東西' }
        ] },
      { speaker:'站務員', emoji:'👨‍✈️', jp:'残高が足りませんね。精算機でチャージしてください。', kana:'ざんだかがたりませんね。せいさんきでちゃーじしてください', romaji:'zandaka ga tarimasen ne. seisanki de chaaji shite kudasai', zh:'餘額不足喔，請到補票機加值。',
        choices:[
          { jp:'精算機はどこですか', kana:'せいさんきはどこですか', zh:'補票機在哪裡？', correct:true, feedback:'不知道在哪就直接問' },
          { jp:'わかりました', kana:'わかりました', zh:'我知道了', correct:true, feedback:'表示理解，去加值就好' },
          { jp:'おかわりください', kana:'おかわりください', zh:'請再來一碗', correct:false, feedback:'這是吃飯續碗用的' }
        ] },
      { speaker:'站務員', emoji:'👨‍✈️', jp:'精算機は改札の左にあります。', kana:'せいさんきはかいさつのひだりにあります', romaji:'seisanki wa kaisatsu no hidari ni arimasu', zh:'補票機在剪票口左邊。',
        choices:[
          { jp:'左ですね。ありがとうございます', kana:'ひだりですね。ありがとうございます', zh:'左邊對吧，謝謝', correct:true, feedback:'確認方向並道謝' },
          { jp:'右ですね', kana:'みぎですね', zh:'右邊對吧', correct:false, feedback:'對方說的是「ひだり（左）」' },
          { jp:'おやすみなさい', kana:'おやすみなさい', zh:'晚安', correct:false, feedback:'這是睡前說的，不是道謝' }
        ] }
    ]}
  ]
},
// ───────────── 飯店入住 Lv4 ─────────────
{
  id: 'hotel', name: '飯店入住', icon: '🏨', color: '#8e44ad',
  unlockLevel: 4,
  desc: '從入住、問早餐到寄放行李，讓櫃台溝通一次搞定。',
  tips: [
    '日本法規規定外國旅客入住時要出示護照，櫃台會影印或掃描，這是正常程序。',
    '入住通常是下午 3 點後、退房 10～11 點前；提早到或退房後還要逛街，可以請櫃台「荷物を預かって」（寄放行李），多半免費。',
    '東京、京都、大阪等地會另收「宿泊税」（住宿稅），每晚約數百日圓，有時要在櫃台另外付現。'
  ],
  vocab: [
    { jp:'予約', kana:'よやく', romaji:'yoyaku', zh:'預約', hint:'諧音：優呀哭', emoji:'📋' },
    { jp:'チェックイン', kana:'ちぇっくいん', romaji:'chekkuin', zh:'入住手續', hint:'諧音：切哭因', emoji:'🛎️' },
    { jp:'チェックアウト', kana:'ちぇっくあうと', romaji:'chekkuauto', zh:'退房', hint:'諧音：切哭阿烏偷', emoji:'👋' },
    { jp:'部屋', kana:'へや', romaji:'heya', zh:'房間', hint:'諧音：嘿呀', emoji:'🚪' },
    { jp:'鍵', kana:'かぎ', romaji:'kagi', zh:'鑰匙', hint:'諧音：咖基', emoji:'🔑' },
    { jp:'朝食', kana:'ちょうしょく', romaji:'choushoku', zh:'早餐', hint:'諧音：秋休哭', emoji:'🍳' },
    { jp:'荷物', kana:'にもつ', romaji:'nimotsu', zh:'行李', hint:'諧音：你摸此', emoji:'🧳' },
    { jp:'名前', kana:'なまえ', romaji:'namae', zh:'名字', hint:'諧音：那媽欸', emoji:'📛' },
    { jp:'禁煙', kana:'きんえん', romaji:'kin\'en', zh:'禁菸', hint:'諧音：金恩', emoji:'🚭' },
    { jp:'エレベーター', kana:'えれべーたー', romaji:'erebeetaa', zh:'電梯', hint:'諧音：欸勒杯塔', emoji:'🛗' },
    { jp:'フロント', kana:'ふろんと', romaji:'furonto', zh:'櫃台', hint:'諧音：夫隆偷', emoji:'🏨' },
    { jp:'一泊', kana:'いっぱく', romaji:'ippaku', zh:'住一晚', hint:'諧音：一趴哭', emoji:'🌙' },
    { jp:'タオル', kana:'たおる', romaji:'taoru', zh:'毛巾', hint:'諧音：他歐嚕', emoji:'🧺' },
    { jp:'領収書', kana:'りょうしゅうしょ', romaji:'ryoushuusho', zh:'收據', hint:'諧音：療咻休', emoji:'🧾' }
  ],
  phrases: [
    { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', romaji:'chekkuin onegai shimasu', zh:'麻煩辦理入住', hint:'諧音：切哭因 歐內嘎伊西媽斯', use:'走到櫃台第一句' },
    { jp:'予約した王です', kana:'よやくしたおうです', romaji:'yoyaku shita Ou desu', zh:'我是有預約的王', hint:'諧音：優呀哭西他 歐～爹斯', use:'報上預約姓名（換成你的姓）' },
    { jp:'朝食は何時からですか', kana:'ちょうしょくはなんじからですか', romaji:'choushoku wa nanji kara desu ka', zh:'早餐幾點開始？', hint:'諧音：秋休哭哇 南基咖拉爹斯卡', use:'確認早餐時間' },
    { jp:'荷物を預かってもらえますか', kana:'にもつをあずかってもらえますか', romaji:'nimotsu o azukatte moraemasu ka', zh:'可以幫我寄放行李嗎？', hint:'諧音：你摸此歐 阿滋咖ㄊ貼 摸拉欸媽斯卡', use:'入住前或退房後' },
    { jp:'Wi-Fiのパスワードを教えてください', kana:'わいふぁいのぱすわーどをおしえてください', romaji:'waifai no pasuwaado o oshiete kudasai', zh:'請告訴我 Wi-Fi 密碼', hint:'諧音：歪發伊諾 趴蘇哇兜歐 歐西欸貼哭搭賽', use:'要連網時' },
    { jp:'タオルをもう一枚ください', kana:'たおるをもういちまいください', romaji:'taoru o mou ichimai kudasai', zh:'請再給我一條毛巾', hint:'諧音：他歐嚕歐 摸伊七媽伊 哭搭賽', use:'備品不夠時' },
    { jp:'チェックアウトお願いします', kana:'ちぇっくあうとおねがいします', romaji:'chekkuauto onegai shimasu', zh:'麻煩辦理退房', hint:'諧音：切哭阿烏偷 歐內嘎伊西媽斯', use:'退房時交鑰匙' }
  ],
  dialogues: [
    { title:'辦理入住', steps:[
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'いらっしゃいませ。', kana:'いらっしゃいませ', romaji:'irasshaimase', zh:'歡迎光臨。',
        choices:[
          { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', zh:'麻煩辦理入住', correct:true, feedback:'到櫃台直接說這句就對了' },
          { jp:'チェックアウトお願いします', kana:'ちぇっくあうとおねがいします', zh:'麻煩辦理退房', correct:false, feedback:'剛到飯店是「チェックイン」，離開才是「チェックアウト」' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'這是吃完飯說的' }
        ] },
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'ご予約のお名前をお願いします。', kana:'ごよやくのおなまえをおねがいします', romaji:'go-yoyaku no onamae o onegai shimasu', zh:'請告訴我預約的姓名。',
        choices:[
          { jp:'王です。予約しています', kana:'おうです。よやくしています', zh:'我姓王，有預約', correct:true, feedback:'報上姓氏即可，也可以出示預約畫面' },
          { jp:'いいえ、結構です', kana:'いいえ、けっこうです', zh:'不用了', correct:false, feedback:'這是拒絕的意思，櫃台會一頭霧水' },
          { jp:'トイレはどこですか', kana:'といれはどこですか', zh:'廁所在哪裡？', correct:false, feedback:'對方在問你名字，先回答再說' }
        ] },
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'パスポートをお願いします。', kana:'ぱすぽーとをおねがいします', romaji:'pasupooto o onegai shimasu', zh:'請出示護照。',
        choices:[
          { jp:'はい、どうぞ', kana:'はい、どうぞ', zh:'好，請', correct:true, feedback:'遞東西給對方時說「どうぞ」' },
          { jp:'すみません、降ります', kana:'すみません、おります', zh:'不好意思，我要下車', correct:false, feedback:'這是在電車上說的' },
          { jp:'おやすみなさい', kana:'おやすみなさい', zh:'晚安', correct:false, feedback:'還沒拿到房間呢，這是睡前說的' }
        ] },
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'お部屋は8階の805号室です。こちらが鍵です。', kana:'おへやははちかいのはっぴゃくごごうしつです。こちらがかぎです', romaji:'oheya wa hachikai no happyaku go goushitsu desu. kochira ga kagi desu', zh:'您的房間在8樓805號房，這是鑰匙。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'收到鑰匙道謝' },
          { jp:'朝食は何時からですか', kana:'ちょうしょくはなんじからですか', zh:'早餐幾點開始？', correct:true, feedback:'趁機問早餐時間，很實用' },
          { jp:'おかわりください', kana:'おかわりください', zh:'請再來一碗', correct:false, feedback:'這是吃飯續碗用的' }
        ] }
    ]},
    { title:'退房並寄放行李', steps:[
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'おはようございます。', kana:'おはようございます', romaji:'ohayou gozaimasu', zh:'早安。',
        choices:[
          { jp:'おはようございます。チェックアウトお願いします', kana:'おはようございます。ちぇっくあうとおねがいします', zh:'早安，麻煩退房', correct:true, feedback:'先回禮再說退房，很得體' },
          { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', zh:'麻煩辦理入住', correct:false, feedback:'要離開是「チェックアウト」' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的' }
        ] },
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'ありがとうございました。ほかに何かございますか？', kana:'ありがとうございました。ほかになにかございますか', romaji:'arigatou gozaimashita. hoka ni nanika gozaimasu ka', zh:'謝謝您，還有其他需要嗎？',
        choices:[
          { jp:'荷物を預かってもらえますか', kana:'にもつをあずかってもらえますか', zh:'可以幫我寄放行李嗎？', correct:true, feedback:'退房後還想逛街，請櫃台寄放行李' },
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'沒有，不用了', correct:true, feedback:'禮貌地表示沒有其他事' },
          { jp:'はじめまして', kana:'はじめまして', zh:'初次見面', correct:false, feedback:'都住了一晚了，這是第一次見面才說的' }
        ] },
      { speaker:'櫃台人員', emoji:'🧑‍💼', jp:'かしこまりました。何時ごろお戻りですか？', kana:'かしこまりました。なんじごろおもどりですか', romaji:'kashikomarimashita. nanji goro omodori desu ka', zh:'好的。請問大約幾點回來？',
        choices:[
          { jp:'3時ごろです', kana:'さんじごろです', zh:'大約3點', correct:true, feedback:'「〜時ごろ」＝大約幾點' },
          { jp:'3人です', kana:'さんにんです', zh:'3個人', correct:false, feedback:'對方問時間，「〜人」是人數' },
          { jp:'3番線です', kana:'さんばんせんです', zh:'3號月台', correct:false, feedback:'這是車站月台號碼' }
        ] }
    ]}
  ]
},
// ───────────── 神社・觀光 Lv5 ─────────────
{
  id: 'shrine', name: '神社・觀光', icon: '⛩️', color: '#c0392b',
  unlockLevel: 5,
  desc: '學會參拜禮儀，買御守、抽籤、請人幫忙拍照都難不倒你。',
  tips: [
    '穿過鳥居前輕輕鞠躬，參道中央是神明走的路，盡量走兩側。',
    '手水舍淨身：右手拿杓洗左手 → 換手洗右手 → 左手捧水漱口 → 再洗左手 → 立起杓子讓水流過杓柄。',
    '神社參拜是「二拜二拍手一拜」：投香油錢、搖鈴後鞠躬兩次、拍手兩次、許願、再鞠躬一次；寺廟則是合掌，不拍手。'
  ],
  vocab: [
    { jp:'神社', kana:'じんじゃ', romaji:'jinja', zh:'神社', hint:'諧音：金甲', emoji:'⛩️' },
    { jp:'お寺', kana:'おてら', romaji:'otera', zh:'寺廟', hint:'諧音：歐貼拉', emoji:'🛕' },
    { jp:'鳥居', kana:'とりい', romaji:'torii', zh:'鳥居', hint:'諧音：偷哩伊', emoji:'⛩️' },
    { jp:'お守り', kana:'おまもり', romaji:'omamori', zh:'御守、護身符', hint:'諧音：歐媽摸哩', emoji:'🧧' },
    { jp:'おみくじ', kana:'おみくじ', romaji:'omikuji', zh:'籤詩', hint:'諧音：歐咪哭基', emoji:'📜' },
    { jp:'絵馬', kana:'えま', romaji:'ema', zh:'繪馬（許願木牌）', hint:'諧音：欸媽', emoji:'🐴' },
    { jp:'お賽銭', kana:'おさいせん', romaji:'osaisen', zh:'香油錢', hint:'諧音：歐賽線', emoji:'🪙' },
    { jp:'御朱印', kana:'ごしゅいん', romaji:'goshuin', zh:'御朱印（參拜印章）', hint:'諧音：狗咻因', emoji:'🖌️' },
    { jp:'参拝', kana:'さんぱい', romaji:'sanpai', zh:'參拜', hint:'諧音：三拜', emoji:'🙏' },
    { jp:'写真', kana:'しゃしん', romaji:'shashin', zh:'照片', hint:'諧音：蝦心', emoji:'📷' },
    { jp:'入場料', kana:'にゅうじょうりょう', romaji:'nyuujouryou', zh:'門票費', hint:'諧音：牛叫療', emoji:'🎟️' },
    { jp:'着物', kana:'きもの', romaji:'kimono', zh:'和服', hint:'諧音：奇摸諾', emoji:'👘' },
    { jp:'大吉', kana:'だいきち', romaji:'daikichi', zh:'大吉', hint:'諧音：代奇七', emoji:'🎉' },
    { jp:'営業時間', kana:'えいぎょうじかん', romaji:'eigyou jikan', zh:'開放時間', hint:'諧音：欸鏡 基看', emoji:'🕘' }
  ],
  phrases: [
    { jp:'写真を撮ってもらえますか', kana:'しゃしんをとってもらえますか', romaji:'shashin o totte moraemasu ka', zh:'可以幫我拍照嗎？', hint:'諧音：蝦心歐 偷ㄊ貼 摸拉欸媽斯卡', use:'請路人幫忙拍照' },
    { jp:'ここで写真を撮ってもいいですか', kana:'ここでしゃしんをとってもいいですか', romaji:'koko de shashin o totte mo ii desu ka', zh:'這裡可以拍照嗎？', hint:'諧音：扣扣爹 蝦心歐 偷ㄊ貼摸 伊～爹斯卡', use:'寺廟內部常禁止攝影，先問' },
    { jp:'入場料はいくらですか', kana:'にゅうじょうりょうはいくらですか', romaji:'nyuujouryou wa ikura desu ka', zh:'門票多少錢？', hint:'諧音：牛叫療哇 伊哭拉爹斯卡', use:'買門票時' },
    { jp:'御朱印をお願いします', kana:'ごしゅいんをおねがいします', romaji:'goshuin o onegai shimasu', zh:'麻煩幫我蓋御朱印', hint:'諧音：狗咻因歐 歐內嘎伊西媽斯', use:'在授與所遞上御朱印帳' },
    { jp:'お守りを一つください', kana:'おまもりをひとつください', romaji:'omamori o hitotsu kudasai', zh:'請給我一個御守', hint:'諧音：歐媽摸哩歐 嘻偷此 哭搭賽', use:'在授與所買御守' },
    { jp:'何時まで開いていますか', kana:'なんじまであいていますか', romaji:'nanji made aite imasu ka', zh:'開放到幾點？', hint:'諧音：南基媽爹 阿伊貼伊媽斯卡', use:'確認開放時間' },
    { jp:'おみくじはどこですか', kana:'おみくじはどこですか', romaji:'omikuji wa doko desu ka', zh:'抽籤的地方在哪裡？', hint:'諧音：歐咪哭基哇 兜扣爹斯卡', use:'想抽籤時' }
  ],
  dialogues: [
    { title:'買御守', steps:[
      { speaker:'巫女', emoji:'👘', jp:'こんにちは。', kana:'こんにちは', romaji:'konnichiwa', zh:'您好。',
        choices:[
          { jp:'お守りを一つください', kana:'おまもりをひとつください', zh:'請給我一個御守', correct:true, feedback:'在授與所直接說要什麼就好' },
          { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', zh:'麻煩辦理入住', correct:false, feedback:'這是飯店櫃台用的' },
          { jp:'乗り換えはどこですか', kana:'のりかえはどこですか', zh:'轉乘在哪裡？', correct:false, feedback:'這是在車站問轉乘的' }
        ] },
      { speaker:'巫女', emoji:'👘', jp:'健康守と交通安全守がありますが、どちらにしますか？', kana:'けんこうまもりとこうつうあんぜんまもりがありますが、どちらにしますか', romaji:'kenkou mamori to koutsuu anzen mamori ga arimasu ga, dochira ni shimasu ka', zh:'有健康御守和交通安全御守，您要哪一個？',
        choices:[
          { jp:'健康守をお願いします', kana:'けんこうまもりをおねがいします', zh:'麻煩給我健康御守', correct:true, feedback:'「〜をお願いします」選擇想要的' },
          { jp:'交通安全守をください', kana:'こうつうあんぜんまもりをください', zh:'請給我交通安全御守', correct:true, feedback:'選交通安全也很棒，旅途平安' },
          { jp:'大吉でした', kana:'だいきちでした', zh:'抽到大吉了', correct:false, feedback:'這是抽籤的結果，跟選御守無關' }
        ] },
      { speaker:'巫女', emoji:'👘', jp:'1000円お納めください。', kana:'せんえんおおさめください', romaji:'sen\'en oosame kudasai', zh:'請奉納1000日圓。',
        choices:[
          { jp:'はい、どうぞ', kana:'はい、どうぞ', zh:'好，請收下', correct:true, feedback:'遞錢時說「どうぞ」。神社會說「お納め」，因為御守是「授與」而非販賣' },
          { jp:'もう少し安くなりませんか', kana:'もうすこしやすくなりませんか', zh:'可以再便宜一點嗎？', correct:false, feedback:'神社的御守是奉納，不能殺價喔' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的' }
        ] }
    ]},
    { title:'請人幫忙拍照', steps:[
      { speaker:'觀光客', emoji:'🧑', jp:'何か困っていますか？', kana:'なにかこまっていますか', romaji:'nanika komatte imasu ka', zh:'有什麼困擾嗎？',
        choices:[
          { jp:'写真を撮ってもらえますか', kana:'しゃしんをとってもらえますか', zh:'可以幫我拍照嗎？', correct:true, feedback:'「〜てもらえますか」禮貌地請人幫忙' },
          { jp:'救急車を呼んでください', kana:'きゅうきゅうしゃをよんでください', zh:'請叫救護車', correct:false, feedback:'這是緊急狀況才說的，會嚇到對方' },
          { jp:'予約した王です', kana:'よやくしたおうです', zh:'我是有預約的王', correct:false, feedback:'這是在飯店或餐廳報到用的' }
        ] },
      { speaker:'觀光客', emoji:'🧑', jp:'いいですよ。鳥居と一緒に撮りますね。はい、チーズ！', kana:'いいですよ。とりいといっしょにとりますね。はい、ちーず', romaji:'ii desu yo. torii to issho ni torimasu ne. hai, chiizu', zh:'好啊，連鳥居一起拍喔。來，起司！',
        choices:[
          { jp:'ありがとうございます！', kana:'ありがとうございます', zh:'謝謝您！', correct:true, feedback:'拍完道謝' },
          { jp:'もう一枚お願いできますか', kana:'もういちまいおねがいできますか', zh:'可以再拍一張嗎？', correct:true, feedback:'想多拍一張就這樣說' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'這是在店裡結帳用的，幫忙拍照不用付錢' }
        ] },
      { speaker:'觀光客', emoji:'🧑', jp:'おみくじはもう引きましたか？', kana:'おみくじはもうひきましたか', romaji:'omikuji wa mou hikimashita ka', zh:'你抽過籤了嗎？',
        choices:[
          { jp:'まだです。どこですか', kana:'まだです。どこですか', zh:'還沒，在哪裡？', correct:true, feedback:'「まだです」＝還沒' },
          { jp:'はい、大吉でした！', kana:'はい、だいきちでした', zh:'抽了，是大吉！', correct:true, feedback:'分享抽籤結果，好運！' },
          { jp:'はい、3番線です', kana:'はい、さんばんせんです', zh:'是，3號月台', correct:false, feedback:'這是車站月台號碼' }
        ] }
    ]}
  ]
},
// ───────────── 機場 Lv6 ─────────────
{
  id: 'airport', name: '機場', icon: '✈️', color: '#2c7be5',
  unlockLevel: 6,
  desc: '報到、選座位、入境審查一路通關，第一步就從機場開始。',
  tips: [
    '出發前在「Visit Japan Web」登錄入境與海關資料，抵達時出示 QR Code 可加快通關。',
    '日本商店的免稅（Tax-free）要在購物時出示護照本人；化妝品、食品等消耗品會封袋，出國前不能拆開。',
    '行動電源（モバイルバッテリー）和打火機不能托運，要放手提行李；手提液體每瓶限 100ml。'
  ],
  vocab: [
    { jp:'空港', kana:'くうこう', romaji:'kuukou', zh:'機場', hint:'諧音：哭～口', emoji:'✈️' },
    { jp:'飛行機', kana:'ひこうき', romaji:'hikouki', zh:'飛機', hint:'諧音：嘻口奇', emoji:'🛩️' },
    { jp:'パスポート', kana:'ぱすぽーと', romaji:'pasupooto', zh:'護照', hint:'諧音：趴蘇剖偷', emoji:'🛂' },
    { jp:'搭乗券', kana:'とうじょうけん', romaji:'toujouken', zh:'登機證', hint:'諧音：偷叫肯', emoji:'🎫' },
    { jp:'搭乗口', kana:'とうじょうぐち', romaji:'toujouguchi', zh:'登機門', hint:'諧音：偷叫古七', emoji:'🚪' },
    { jp:'出発', kana:'しゅっぱつ', romaji:'shuppatsu', zh:'出發', hint:'諧音：咻趴此', emoji:'🛫' },
    { jp:'到着', kana:'とうちゃく', romaji:'touchaku', zh:'抵達', hint:'諧音：偷洽哭', emoji:'🛬' },
    { jp:'便', kana:'びん', romaji:'bin', zh:'班機（航班）', hint:'諧音：冰', emoji:'🔢' },
    { jp:'窓側', kana:'まどがわ', romaji:'madogawa', zh:'靠窗', hint:'諧音：媽兜嘎哇', emoji:'🪟' },
    { jp:'通路側', kana:'つうろがわ', romaji:'tsuurogawa', zh:'靠走道', hint:'諧音：此嚕嘎哇', emoji:'🚶' },
    { jp:'手荷物', kana:'てにもつ', romaji:'tenimotsu', zh:'手提行李', hint:'諧音：貼你摸此', emoji:'👜' },
    { jp:'預け荷物', kana:'あずけにもつ', romaji:'azuke nimotsu', zh:'托運行李', hint:'諧音：阿滋給 你摸此', emoji:'🧳' },
    { jp:'免税', kana:'めんぜい', romaji:'menzei', zh:'免稅', hint:'諧音：面賊', emoji:'🏷️' },
    { jp:'遅延', kana:'ちえん', romaji:'chien', zh:'延誤', hint:'諧音：七恩', emoji:'⏰' },
    { jp:'両替', kana:'りょうがえ', romaji:'ryougae', zh:'換錢', hint:'諧音：療嘎欸', emoji:'💱' }
  ],
  phrases: [
    { jp:'パスポートをお願いします', kana:'ぱすぽーとをおねがいします', romaji:'pasupooto o onegai shimasu', zh:'請出示護照', hint:'諧音：趴蘇剖偷歐 歐內嘎伊西媽斯', use:'地勤或海關會對你說，聽懂就遞護照' },
    { jp:'窓側の席をお願いします', kana:'まどがわのせきをおねがいします', romaji:'madogawa no seki o onegai shimasu', zh:'麻煩給我靠窗的座位', hint:'諧音：媽兜嘎哇諾 誰奇歐 歐內嘎伊西媽斯', use:'報到選位時' },
    { jp:'搭乗口はどこですか', kana:'とうじょうぐちはどこですか', romaji:'toujouguchi wa doko desu ka', zh:'登機門在哪裡？', hint:'諧音：偷叫古七哇 兜扣爹斯卡', use:'找登機門' },
    { jp:'観光です', kana:'かんこうです', romaji:'kankou desu', zh:'來觀光的', hint:'諧音：看口爹斯', use:'入境審查被問目的時' },
    { jp:'5日間です', kana:'いつかかんです', romaji:'itsukakan desu', zh:'停留五天', hint:'諧音：伊此咖看爹斯', use:'被問停留天數時' },
    { jp:'これは機内に持ち込めますか', kana:'これはきないにもちこめますか', romaji:'kore wa kinai ni mochikomemasu ka', zh:'這個可以帶上飛機嗎？', hint:'諧音：扣勒哇 奇那伊你 摸七扣妹媽斯卡', use:'不確定能否手提時' },
    { jp:'免税できますか', kana:'めんぜいできますか', romaji:'menzei dekimasu ka', zh:'可以免稅嗎？', hint:'諧音：面賊 爹奇媽斯卡', use:'購物結帳前' },
    { jp:'両替所はどこですか', kana:'りょうがえじょはどこですか', romaji:'ryougaejo wa doko desu ka', zh:'換匯處在哪裡？', hint:'諧音：療嘎欸久哇 兜扣爹斯卡', use:'需要換日圓時' }
  ],
  dialogues: [
    { title:'報到劃位', steps:[
      { speaker:'地勤人員', emoji:'👩‍✈️', jp:'パスポートをお願いします。', kana:'ぱすぽーとをおねがいします', romaji:'pasupooto o onegai shimasu', zh:'請出示護照。',
        choices:[
          { jp:'はい、どうぞ', kana:'はい、どうぞ', zh:'好，請', correct:true, feedback:'遞出護照時說「どうぞ」' },
          { jp:'いいえ、結構です', kana:'いいえ、けっこうです', zh:'不用了', correct:false, feedback:'這是拒絕，沒有護照可不能登機' },
          { jp:'御朱印をお願いします', kana:'ごしゅいんをおねがいします', zh:'麻煩蓋御朱印', correct:false, feedback:'這是在神社說的' }
        ] },
      { speaker:'地勤人員', emoji:'👩‍✈️', jp:'お預けになるお荷物はありますか？', kana:'おあずけになるおにもつはありますか', romaji:'oazuke ni naru onimotsu wa arimasu ka', zh:'有要托運的行李嗎？',
        choices:[
          { jp:'はい、スーツケースが一つです', kana:'はい、すーつけーすがひとつです', zh:'有，一個行李箱', correct:true, feedback:'說明托運件數' },
          { jp:'いいえ、手荷物だけです', kana:'いいえ、てにもつだけです', zh:'沒有，只有手提行李', correct:true, feedback:'沒有托運行李時這樣回答' },
          { jp:'はい、二人です', kana:'はい、ふたりです', zh:'是，兩個人', correct:false, feedback:'對方問行李，不是人數' }
        ] },
      { speaker:'地勤人員', emoji:'👩‍✈️', jp:'お座席は窓側と通路側、どちらがよろしいですか？', kana:'おざせきはまどがわとつうろがわ、どちらがよろしいですか', romaji:'ozaseki wa madogawa to tsuurogawa, dochira ga yoroshii desu ka', zh:'座位要靠窗還是靠走道？',
        choices:[
          { jp:'窓側をお願いします', kana:'まどがわをおねがいします', zh:'麻煩靠窗', correct:true, feedback:'想看風景選窗邊' },
          { jp:'通路側をお願いします', kana:'つうろがわをおねがいします', zh:'麻煩靠走道', correct:true, feedback:'常上廁所選走道比較方便' },
          { jp:'禁煙席をお願いします', kana:'きんえんせきをおねがいします', zh:'麻煩給我禁菸座位', correct:false, feedback:'飛機上全面禁菸，這是在餐廳說的' }
        ] },
      { speaker:'地勤人員', emoji:'👩‍✈️', jp:'スーツケースにモバイルバッテリーは入っていませんか？', kana:'すーつけーすにもばいるばってりーははいっていませんか', romaji:'suutsukeesu ni mobairu batterii wa haitte imasen ka', zh:'行李箱裡沒有放行動電源吧？',
        choices:[
          { jp:'入っていません', kana:'はいっていません', zh:'沒有放', correct:true, feedback:'確認沒有就能順利托運' },
          { jp:'あ、入っています。出します', kana:'あ、はいっています。だします', zh:'啊，有放，我拿出來', correct:true, feedback:'行動電源不能托運，誠實拿出來' },
          { jp:'チャージしてください', kana:'ちゃーじしてください', zh:'請幫我加值', correct:false, feedback:'這是 IC 卡加值，跟行動電源無關' }
        ] }
    ]},
    { title:'入境審查', steps:[
      { speaker:'入境審查官', emoji:'👮', jp:'入国の目的は何ですか？', kana:'にゅうこくのもくてきはなんですか', romaji:'nyuukoku no mokuteki wa nan desu ka', zh:'入境的目的是什麼？',
        choices:[
          { jp:'観光です', kana:'かんこうです', zh:'觀光', correct:true, feedback:'免簽入境最常見的回答' },
          { jp:'仕事を探しに来ました', kana:'しごとをさがしにきました', zh:'我來找工作', correct:false, feedback:'免簽是短期觀光，不能工作，這樣說會被詳細盤查' },
          { jp:'新宿まで行きたいです', kana:'しんじゅくまでいきたいです', zh:'我想到新宿', correct:false, feedback:'對方問「目的」，這是問路時說的' }
        ] },
      { speaker:'入境審查官', emoji:'👮', jp:'何日間滞在しますか？', kana:'なんにちかんたいざいしますか', romaji:'nannichikan taizai shimasu ka', zh:'要停留幾天？',
        choices:[
          { jp:'5日間です', kana:'いつかかんです', zh:'五天', correct:true, feedback:'「〜日間」表示天數，5天讀「いつか」' },
          { jp:'5人です', kana:'ごにんです', zh:'五個人', correct:false, feedback:'問的是天數，「〜人」是人數' },
          { jp:'5番線です', kana:'ごばんせんです', zh:'5號月台', correct:false, feedback:'這是車站月台' }
        ] },
      { speaker:'入境審查官', emoji:'👮', jp:'どこに泊まりますか？', kana:'どこにとまりますか', romaji:'doko ni tomarimasu ka', zh:'住在哪裡？',
        choices:[
          { jp:'新宿のホテルです', kana:'しんじゅくのほてるです', zh:'新宿的飯店', correct:true, feedback:'說出住宿地點，可準備好飯店名稱' },
          { jp:'友達の家です', kana:'ともだちのいえです', zh:'朋友家', correct:true, feedback:'住朋友家也可以，最好備好地址' },
          { jp:'チェックアウトお願いします', kana:'ちぇっくあうとおねがいします', zh:'麻煩退房', correct:false, feedback:'這是在飯店退房用的' }
        ] }
    ]}
  ]
},
// ───────────── 緊急求助・藥局 Lv7 ─────────────
{
  id: 'emergency', name: '緊急求助・藥局', icon: '🚑', color: '#e74c3c',
  unlockLevel: 7,
  desc: '生病、受傷、掉東西時能開口求助，是旅途最重要的保險。',
  tips: [
    '日本緊急電話：救護車／消防 119、警察 110，都免費；叫救護車本身不收費。',
    '觀光客可撥「Japan Visitor Hotline」050-3816-2787（日本國家觀光局），24 小時提供中文等多語服務。',
    '藥妝店可買成藥，處方藥則要醫院開的「処方箋」到「薬局」領；東西遺失可到「交番」報案，日本找回失物的機率很高。'
  ],
  vocab: [
    { jp:'救急車', kana:'きゅうきゅうしゃ', romaji:'kyuukyuusha', zh:'救護車', hint:'諧音：揪揪蝦', emoji:'🚑' },
    { jp:'病院', kana:'びょういん', romaji:'byouin', zh:'醫院', hint:'諧音：表因', emoji:'🏥' },
    { jp:'薬局', kana:'やっきょく', romaji:'yakkyoku', zh:'藥局', hint:'諧音：呀揪哭', emoji:'⚕️' },
    { jp:'薬', kana:'くすり', romaji:'kusuri', zh:'藥', hint:'諧音：哭蘇哩', emoji:'💊' },
    { jp:'熱', kana:'ねつ', romaji:'netsu', zh:'發燒', hint:'諧音：內此', emoji:'🤒' },
    { jp:'頭痛', kana:'ずつう', romaji:'zutsuu', zh:'頭痛', hint:'諧音：滋此', emoji:'🤕' },
    { jp:'お腹', kana:'おなか', romaji:'onaka', zh:'肚子', hint:'諧音：歐那咖', emoji:'😣' },
    { jp:'痛い', kana:'いたい', romaji:'itai', zh:'痛', hint:'諧音：伊太', emoji:'😖' },
    { jp:'風邪', kana:'かぜ', romaji:'kaze', zh:'感冒', hint:'諧音：咖賊', emoji:'🤧' },
    { jp:'アレルギー', kana:'あれるぎー', romaji:'arerugii', zh:'過敏', hint:'諧音：阿勒嚕機', emoji:'⚠️' },
    { jp:'警察', kana:'けいさつ', romaji:'keisatsu', zh:'警察', hint:'諧音：給沙此', emoji:'🚓' },
    { jp:'財布', kana:'さいふ', romaji:'saifu', zh:'錢包', hint:'諧音：賽夫', emoji:'👛' },
    { jp:'落とし物', kana:'おとしもの', romaji:'otoshimono', zh:'遺失物', hint:'諧音：歐偷西摸諾', emoji:'🔍' },
    { jp:'保険', kana:'ほけん', romaji:'hoken', zh:'保險', hint:'諧音：齁肯', emoji:'📄' },
    { jp:'助けて', kana:'たすけて', romaji:'tasukete', zh:'救命', hint:'諧音：他斯給貼', emoji:'🆘' }
  ],
  phrases: [
    { jp:'救急車を呼んでください', kana:'きゅうきゅうしゃをよんでください', romaji:'kyuukyuusha o yonde kudasai', zh:'請叫救護車', hint:'諧音：揪揪蝦歐 用爹哭搭賽', use:'有人受傷或昏倒時' },
    { jp:'助けてください', kana:'たすけてください', romaji:'tasukete kudasai', zh:'請幫幫我', hint:'諧音：他斯給貼 哭搭賽', use:'遇到危險或需要協助時' },
    { jp:'ここが痛いです', kana:'ここがいたいです', romaji:'koko ga itai desu', zh:'這裡痛', hint:'諧音：扣扣嘎 伊太爹斯', use:'指著痛的部位' },
    { jp:'熱があります', kana:'ねつがあります', romaji:'netsu ga arimasu', zh:'我發燒了', hint:'諧音：內此嘎 阿哩媽斯', use:'在藥局或醫院說明症狀' },
    { jp:'頭痛薬はありますか', kana:'ずつうやくはありますか', romaji:'zutsuuyaku wa arimasu ka', zh:'有頭痛藥嗎？', hint:'諧音：滋此呀哭哇 阿哩媽斯卡', use:'在藥局找藥' },
    { jp:'近くに病院はありますか', kana:'ちかくにびょういんはありますか', romaji:'chikaku ni byouin wa arimasu ka', zh:'附近有醫院嗎？', hint:'諧音：七咖哭你 表因哇 阿哩媽斯卡', use:'需要看醫生時' },
    { jp:'財布をなくしました', kana:'さいふをなくしました', romaji:'saifu o nakushimashita', zh:'我錢包弄丟了', hint:'諧音：賽夫歐 那哭西媽西他', use:'到交番報案時' },
    { jp:'中国語を話せる人はいますか', kana:'ちゅうごくごをはなせるひとはいますか', romaji:'chuugokugo o hanaseru hito wa imasu ka', zh:'有會說中文的人嗎？', hint:'諧音：啾狗哭狗歐 哈那誰嚕 嘻偷哇 伊媽斯卡', use:'日語不夠用時' }
  ],
  dialogues: [
    { title:'藥局買藥', steps:[
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'どうされましたか？', kana:'どうされましたか', romaji:'dou saremashita ka', zh:'您怎麼了？',
        choices:[
          { jp:'熱があります', kana:'ねつがあります', zh:'我發燒了', correct:true, feedback:'直接說症狀最清楚' },
          { jp:'頭が痛いです', kana:'あたまがいたいです', zh:'我頭痛', correct:true, feedback:'「〜が痛いです」可套用任何部位' },
          { jp:'おみくじはどこですか', kana:'おみくじはどこですか', zh:'抽籤在哪裡？', correct:false, feedback:'這是在神社說的' }
        ] },
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'いつからですか？', kana:'いつからですか', romaji:'itsu kara desu ka', zh:'從什麼時候開始的？',
        choices:[
          { jp:'昨日の夜からです', kana:'きのうのよるからです', zh:'從昨天晚上開始', correct:true, feedback:'「〜からです」說明開始的時間' },
          { jp:'新宿からです', kana:'しんじゅくからです', zh:'從新宿來的', correct:false, feedback:'對方問「時間」，這是在回答「地點」' },
          { jp:'いつでもいいです', kana:'いつでもいいです', zh:'什麼時候都可以', correct:false, feedback:'這是約時間時說的，答非所問' }
        ] },
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'アレルギーはありますか？', kana:'あれるぎーはありますか', romaji:'arerugii wa arimasu ka', zh:'有過敏嗎？',
        choices:[
          { jp:'いいえ、特にありません', kana:'いいえ、とくにありません', zh:'沒有特別的過敏', correct:true, feedback:'沒有過敏就這樣回答' },
          { jp:'はい、卵アレルギーがあります', kana:'はい、たまごあれるぎーがあります', zh:'有，我對蛋過敏', correct:true, feedback:'有過敏一定要說清楚' },
          { jp:'はい、Wi-Fiがあります', kana:'はい、わいふぁいがあります', zh:'有，有 Wi-Fi', correct:false, feedback:'問的是過敏，不是網路' }
        ] },
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'この薬を一日三回、食後に飲んでください。', kana:'このくすりをいちにちさんかい、しょくごにのんでください', romaji:'kono kusuri o ichinichi sankai, shokugo ni nonde kudasai', zh:'這個藥一天三次，飯後吃。',
        choices:[
          { jp:'わかりました。一日三回ですね', kana:'わかりました。いちにちさんかいですね', zh:'了解，一天三次對吧', correct:true, feedback:'複述用法，避免吃錯藥' },
          { jp:'食前ですね', kana:'しょくぜんですね', zh:'是飯前對吧', correct:false, feedback:'對方說「食後（飯後）」，「食前」是飯前' },
          { jp:'お守りを一つください', kana:'おまもりをひとつください', zh:'請給我一個御守', correct:false, feedback:'這是在神社說的' }
        ] }
    ]},
    { title:'朋友昏倒了', steps:[
      { speaker:'路人', emoji:'👨', jp:'大丈夫ですか？', kana:'だいじょうぶですか', romaji:'daijoubu desu ka', zh:'你們還好嗎？',
        choices:[
          { jp:'友達が倒れました！救急車を呼んでください', kana:'ともだちがたおれました！きゅうきゅうしゃをよんでください', zh:'我朋友昏倒了！請叫救護車', correct:true, feedback:'緊急時清楚說明狀況並請對方叫救護車' },
          { jp:'大丈夫です、ありがとう', kana:'だいじょうぶです、ありがとう', zh:'沒事，謝謝', correct:false, feedback:'朋友昏倒時千萬別客氣說沒事' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'這是在店裡結帳說的' }
        ] },
      { speaker:'路人', emoji:'👨', jp:'わかりました、119番に電話します！意識はありますか？', kana:'わかりました、ひゃくじゅうきゅうばんにでんわします！いしきはありますか', romaji:'wakarimashita, hyakujuukyuu ban ni denwa shimasu! ishiki wa arimasu ka', zh:'好，我打119！他有意識嗎？',
        choices:[
          { jp:'はい、でも話せません', kana:'はい、でもはなせません', zh:'有，但不能說話', correct:true, feedback:'清楚回答意識狀態' },
          { jp:'いいえ、ありません', kana:'いいえ、ありません', zh:'沒有', correct:true, feedback:'失去意識也要如實告知' },
          { jp:'110番ですか', kana:'ひゃくとおばんですか', zh:'是110嗎？', correct:false, feedback:'110 是警察，叫救護車是 119' }
        ] },
      { speaker:'路人', emoji:'👨', jp:'救急車がすぐ来ます。日本語は話せますか？', kana:'きゅうきゅうしゃがすぐきます。にほんごははなせますか', romaji:'kyuukyuusha ga sugu kimasu. nihongo wa hanasemasu ka', zh:'救護車馬上就來。你會說日語嗎？',
        choices:[
          { jp:'少しだけです', kana:'すこしだけです', zh:'只會一點點', correct:true, feedback:'誠實說明，對方會用簡單的日語' },
          { jp:'中国語を話せる人はいますか', kana:'ちゅうごくごをはなせるひとはいますか', zh:'有會說中文的人嗎？', correct:true, feedback:'緊急時找能溝通的人很重要' },
          { jp:'はじめまして', kana:'はじめまして', zh:'初次見面', correct:false, feedback:'這是自我介紹用的，不是回答問題' }
        ] }
    ]},
    { title:'在派出所報失', steps:[
      { speaker:'警察', emoji:'👮', jp:'どうしましたか？', kana:'どうしましたか', romaji:'dou shimashita ka', zh:'怎麼了嗎？',
        choices:[
          { jp:'財布をなくしました', kana:'さいふをなくしました', zh:'我錢包弄丟了', correct:true, feedback:'「〜をなくしました」＝弄丟了〜' },
          { jp:'財布を買いたいです', kana:'さいふをかいたいです', zh:'我想買錢包', correct:false, feedback:'這是去商店說的，派出所不賣錢包' },
          { jp:'チェックインお願いします', kana:'ちぇっくいんおねがいします', zh:'麻煩辦理入住', correct:false, feedback:'這是飯店櫃台用的' }
        ] },
      { speaker:'警察', emoji:'👮', jp:'どこでなくしましたか？', kana:'どこでなくしましたか', romaji:'doko de nakushimashita ka', zh:'在哪裡弄丟的？',
        choices:[
          { jp:'電車の中だと思います', kana:'でんしゃのなかだとおもいます', zh:'我想是在電車上', correct:true, feedback:'「〜だと思います」表示推測' },
          { jp:'わかりません', kana:'わかりません', zh:'我不知道', correct:true, feedback:'真的不知道就照實說' },
          { jp:'昨日です', kana:'きのうです', zh:'昨天', correct:false, feedback:'「どこ」問地點，「昨日」是回答時間' }
        ] },
      { speaker:'警察', emoji:'👮', jp:'この紙に名前と電話番号を書いてください。', kana:'このかみになまえとでんわばんごうをかいてください', romaji:'kono kami ni namae to denwa bangou o kaite kudasai', zh:'請在這張紙寫上名字和電話號碼。',
        choices:[
          { jp:'はい、わかりました', kana:'はい、わかりました', zh:'好，我知道了', correct:true, feedback:'照指示填寫，找到時才能聯絡你' },
          { jp:'もう少し安くなりませんか', kana:'もうすこしやすくなりませんか', zh:'可以便宜一點嗎？', correct:false, feedback:'這是殺價用的，報案不用錢' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的' }
        ] }
    ]}
  ]
}
);

// 燒肉店（依旅遊回饋新增）
SCENES.push({
  id: 'yakiniku', name: '燒肉店', icon: '🥩', color: '#8b3a2a',
  unlockLevel: 4,
  desc: '用 QR 平板點肉、請店員換烤網、加點和結帳，一次搞定燒肉店。',
  tips: [
    '燒肉的份量單位是「一人前（いちにんまえ）」，點兩份就說「二人前」。',
    '烤網烤黑、肉一直黏時，可以說「網交換お願いします」請店員換新的網子，通常免費。',
    '很多燒肉店用桌上的 QR 碼或平板點餐；結帳時多半是拿帳單（伝票）到櫃台付錢。'
  ],
  vocab: [
    { jp:'タン塩', kana:'たんしお', romaji:'tanshio', zh:'鹽味牛舌', hint:'諧音：探西歐', emoji:'👅' },
    { jp:'カルビ', kana:'かるび', romaji:'karubi', zh:'牛五花', hint:'諧音：卡嚕逼', emoji:'🥩' },
    { jp:'ハラミ', kana:'はらみ', romaji:'harami', zh:'橫膈膜肉', hint:'諧音：哈拉咪', emoji:'🥩' },
    { jp:'ロース', kana:'ろーす', romaji:'roosu', zh:'里肌肉', hint:'諧音：摟～酥', emoji:'🥩' },
    { jp:'ホルモン', kana:'ほるもん', romaji:'horumon', zh:'內臟（牛腸等）', hint:'諧音：齁嚕盟', emoji:'🍖' },
    { jp:'網', kana:'あみ', romaji:'ami', zh:'烤網', hint:'諧音：阿咪', emoji:'🔥' },
    { jp:'トング', kana:'とんぐ', romaji:'tongu', zh:'夾子', hint:'諧音：通古', emoji:'🥢' },
    { jp:'タレ', kana:'たれ', romaji:'tare', zh:'醬汁', hint:'諧音：他雷', emoji:'🥫' },
    { jp:'ライス', kana:'らいす', romaji:'raisu', zh:'白飯', hint:'諧音：賴酥', emoji:'🍚' },
    { jp:'キムチ', kana:'きむち', romaji:'kimuchi', zh:'泡菜', hint:'諧音：key母七', emoji:'🥬' },
    { jp:'一人前', kana:'いちにんまえ', romaji:'ichininmae', zh:'一人份', hint:'諧音：一七您媽欸', emoji:'1️⃣' },
    { jp:'焼く', kana:'やく', romaji:'yaku', zh:'烤', hint:'諧音：呀哭', emoji:'🔥' },
    { jp:'食べ放題', kana:'たべほうだい', romaji:'tabehoudai', zh:'吃到飽', hint:'諧音：他貝齁～搭伊', emoji:'♾️' }
  ],
  phrases: [
    { jp:'網交換お願いします', kana:'あみこうかんおねがいします', romaji:'ami koukan onegaishimasu', zh:'麻煩幫我換烤網', hint:'諧音：阿咪 摳～康 歐內嘎伊西媽酥', use:'烤網烤黑、肉一直黏的時候' },
    { jp:'カルビを二人前お願いします', kana:'かるびをににんまえおねがいします', romaji:'karubi o nininmae onegaishimasu', zh:'請給我兩人份牛五花', hint:'諧音：卡嚕逼喔 你您媽欸 歐內嘎伊西媽酥', use:'點肉時，份量用「〜人前」' },
    { jp:'タンは塩でお願いします', kana:'たんはしおでおねがいします', romaji:'tan wa shio de onegaishimasu', zh:'牛舌要鹽味的', hint:'諧音：探哇 西歐爹 歐內嘎伊西媽酥', use:'店員問鹽味還是醬汁時' },
    { jp:'すみません、トングをもう一つください', kana:'すみません、とんぐをもうひとつください', romaji:'sumimasen, tongu o mou hitotsu kudasai', zh:'不好意思，請再給我一支夾子', hint:'諧音：酥咪媽sen 通古喔 摸～ hi偷此 哭搭賽', use:'生肉和熟肉想分開夾的時候' },
    { jp:'ラストオーダーは何時ですか', kana:'らすとおーだーはなんじですか', romaji:'rasuto oodaa wa nanji desu ka', zh:'最後點餐是幾點？', hint:'諧音：拉酥偷 歐～搭～哇 南基 爹酥卡', use:'吃到飽有時間限制時' },
    { jp:'お会計お願いします', kana:'おかいけいおねがいします', romaji:'okaikei onegaishimasu', zh:'麻煩結帳', hint:'諧音：歐卡伊kei 歐內嘎伊西媽酥', use:'吃完要結帳時' }
  ],
  dialogues: [
    { title:'入座點肉', steps:[
      { speaker:'店員', emoji:'🧑‍🍳', jp:'いらっしゃいませ。何名様ですか。', kana:'いらっしゃいませ。なんめいさまですか', romaji:'irasshaimase. nanmei sama desu ka', zh:'歡迎光臨，請問幾位？',
        choices:[
          { jp:'二人です', kana:'ふたりです', zh:'兩個人', correct:true, feedback:'人數用「〜人」：一人、二人、三人' },
          { jp:'二つです', kana:'ふたつです', zh:'兩個（東西）', correct:false, feedback:'「二つ」是數東西，人數要說「二人」' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是開動前說的' }
        ] },
      { speaker:'店員', emoji:'🧑‍🍳', jp:'ご注文はテーブルのQRコードからお願いします。', kana:'ごちゅうもんはてーぶるのきゅーあーるこーどからおねがいします', romaji:'gochuumon wa teeburu no QR koodo kara onegaishimasu', zh:'請用桌上的 QR 碼點餐。',
        choices:[
          { jp:'はい、わかりました', kana:'はい、わかりました', zh:'好，我知道了', correct:true, feedback:'表示了解' },
          { jp:'QRコードをください', kana:'きゅーあーるこーどをください', zh:'請給我 QR 碼', correct:false, feedback:'QR 碼已經貼在桌上了' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'這是吃完要走時說的' }
        ] },
      { speaker:'店員', emoji:'🧑‍🍳', jp:'タンは塩とタレ、どちらにしますか。', kana:'たんはしおとたれ、どちらにしますか', romaji:'tan wa shio to tare, dochira ni shimasu ka', zh:'牛舌要鹽味還是醬汁？',
        choices:[
          { jp:'塩でお願いします', kana:'しおでおねがいします', zh:'鹽味', correct:true, feedback:'「〜でお願いします」表示選擇' },
          { jp:'タレでお願いします', kana:'たれでおねがいします', zh:'醬汁', correct:true, feedback:'「〜でお願いします」表示選擇' },
          { jp:'塩はどこですか', kana:'しおはどこですか', zh:'鹽在哪裡？', correct:false, feedback:'這是問鹽在哪裡' }
        ] }
    ]},
    { title:'換網和結帳', steps:[
      { speaker:'店員', emoji:'🧑‍🍳', jp:'はい、お呼びでしょうか。', kana:'はい、およびでしょうか', romaji:'hai, oyobi deshou ka', zh:'是，請問有什麼需要？',
        choices:[
          { jp:'網交換お願いします', kana:'あみこうかんおねがいします', zh:'麻煩換烤網', correct:true, feedback:'烤網黑了就請店員換' },
          { jp:'網をあげます', kana:'あみをあげます', zh:'我給你網子', correct:false, feedback:'「あげます」是「我給你」' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員說的' }
        ] },
      { speaker:'店員', emoji:'🧑‍🍳', jp:'ラストオーダーですが、ご注文はよろしいですか。', kana:'らすとおーだーですが、ごちゅうもんはよろしいですか', romaji:'rasuto oodaa desu ga, gochuumon wa yoroshii desu ka', zh:'最後點餐了，還要點嗎？',
        choices:[
          { jp:'はい、大丈夫です', kana:'はい、だいじょうぶです', zh:'不用了，沒問題', correct:true, feedback:'「大丈夫です」在這裡是「不用了」' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是開動前說的' },
          { jp:'ラストオーダーをあげます', kana:'らすとおーだーをあげます', zh:'（不通順）', correct:false, feedback:'「あげます」是「我給你」' }
        ] },
      { speaker:'店員', emoji:'🧑‍🍳', jp:'お会計、六千五百円です。', kana:'おかいけい、ろくせんごひゃくえんです', romaji:'okaikei, rokusen gohyaku en desu', zh:'總共 6500 日圓。',
        choices:[
          { jp:'カードでお願いします', kana:'かーどでおねがいします', zh:'我刷卡', correct:true, feedback:'付款方式用「〜でお願いします」' },
          { jp:'現金でお願いします', kana:'げんきんでおねがいします', zh:'我付現金', correct:true, feedback:'付款方式用「〜でお願いします」' },
          { jp:'六千五百円をください', kana:'ろくせんごひゃくえんをください', zh:'請給我 6500 日圓', correct:false, feedback:'這是跟對方要錢' }
        ] }
    ]}
  ]
});
