window.SCENES = window.SCENES || [];

SCENES.push(
// ==================== Lv1 便利商店 ====================
{
  id: 'konbini', name: '便利商店', icon: '🏪', color: '#2e8b57',
  unlockLevel: 1,
  desc: '日本旅行最常進的地方！學會結帳時店員會問的三句話：加熱、袋子、集點卡。',
  tips: [
    '日本便利商店的塑膠袋要另外付費（約 3–5 圓），店員會問「レジ袋はご利用ですか？」，不需要就說「大丈夫です」。',
    '買便當時店員會問「温めますか？」（要加熱嗎），回答「お願いします」就會幫你微波。',
    '結帳時零錢要放在收銀台上的小托盤（カルトン），不要直接塞到店員手上。'
  ],
  vocab: [
    { jp:'レジ袋', kana:'れじぶくろ', romaji:'rejibukuro', zh:'塑膠袋', hint:'諧音：勒基布哭囉', emoji:'🛍️' },
    { jp:'おにぎり', kana:'おにぎり', romaji:'onigiri', zh:'飯糰', hint:'諧音：歐尼gi哩', emoji:'🍙' },
    { jp:'お弁当', kana:'おべんとう', romaji:'obentō', zh:'便當', hint:'諧音：歐本偷', emoji:'🍱' },
    { jp:'飲み物', kana:'のみもの', romaji:'nomimono', zh:'飲料', hint:'諧音：諾米摸諾', emoji:'🥤' },
    { jp:'水', kana:'みず', romaji:'mizu', zh:'水', hint:'諧音：咪茲', emoji:'💧' },
    { jp:'お茶', kana:'おちゃ', romaji:'ocha', zh:'茶', hint:'諧音：歐恰', emoji:'🍵' },
    { jp:'お箸', kana:'おはし', romaji:'ohashi', zh:'筷子', hint:'諧音：歐哈西', emoji:'🥢' },
    { jp:'スプーン', kana:'すぷーん', romaji:'supūn', zh:'湯匙', hint:'諧音：斯噗～恩', emoji:'🥄' },
    { jp:'レシート', kana:'れしーと', romaji:'reshīto', zh:'收據', hint:'諧音：勒西～偷', emoji:'🧾' },
    { jp:'ポイントカード', kana:'ぽいんとかーど', romaji:'pointo kādo', zh:'集點卡', hint:'諧音：剖因偷卡～兜', emoji:'💳' },
    { jp:'現金', kana:'げんきん', romaji:'genkin', zh:'現金', hint:'諧音：給恩金', emoji:'💴' },
    { jp:'お釣り', kana:'おつり', romaji:'otsuri', zh:'找零', hint:'諧音：歐此哩', emoji:'🪙' },
    { jp:'温める', kana:'あたためる', romaji:'atatameru', zh:'加熱', hint:'諧音：阿他他妹嚕', emoji:'🔥' },
    { jp:'トイレ', kana:'といれ', romaji:'toire', zh:'廁所', hint:'諧音：偷伊勒', emoji:'🚻' }
  ],
  phrases: [
    { jp:'これください', kana:'これください', romaji:'kore kudasai', zh:'我要這個', hint:'諧音：摳勒哭搭賽', use:'指著商品時說' },
    { jp:'袋はいりません', kana:'ふくろはいりません', romaji:'fukuro wa irimasen', zh:'不需要袋子', hint:'諧音：夫哭囉哇 伊哩媽森', use:'結帳時拒絕塑膠袋' },
    { jp:'温めてください', kana:'あたためてください', romaji:'atatamete kudasai', zh:'請幫我加熱', hint:'諧音：阿他他妹貼 哭搭賽', use:'買便當、包子時主動請店員微波' },
    { jp:'お箸をください', kana:'おはしをください', romaji:'ohashi o kudasai', zh:'請給我筷子', hint:'諧音：歐哈西歐 哭搭賽', use:'買便當忘了拿筷子時' },
    { jp:'カードで払えますか', kana:'かーどではらえますか', romaji:'kādo de haraemasu ka', zh:'可以刷卡嗎？', hint:'諧音：卡～兜爹 哈拉欸媽斯卡', use:'付款前確認能不能刷卡' },
    { jp:'トイレはどこですか', kana:'といれはどこですか', romaji:'toire wa doko desu ka', zh:'廁所在哪裡？', hint:'諧音：偷伊勒哇 兜摳爹斯卡', use:'想借廁所時' },
    { jp:'ありがとうございます', kana:'ありがとうございます', romaji:'arigatō gozaimasu', zh:'謝謝您', hint:'諧音：阿哩嘎偷 勾紮伊媽斯', use:'接過商品、找零時' }
  ],
  dialogues: [
    { title:'結帳', steps:[
      { speaker:'店員', emoji:'🧑‍💼', jp:'お弁当、温めますか？', kana:'おべんとう、あたためますか', romaji:'obentō, atatamemasu ka', zh:'便當要幫您加熱嗎？',
        choices:[
          { jp:'はい、お願いします', kana:'はい、おねがいします', zh:'好，麻煩你', correct:true, feedback:'「お願いします」是萬用的「麻煩了」，店員就會幫你微波。' },
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'「大丈夫です」在這裡是禮貌地拒絕：不用麻煩了。' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'「いただきます」是吃飯前說的，不是回答要不要加熱。' }
        ] },
      { speaker:'店員', emoji:'🧑‍💼', jp:'レジ袋はご利用ですか？', kana:'れじぶくろはごりようですか', romaji:'rejibukuro wa goriyō desu ka', zh:'需要塑膠袋嗎？',
        choices:[
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'不需要袋子就這樣說，可以省下袋子錢。' },
          { jp:'はい、お願いします', kana:'はい、おねがいします', zh:'好，麻煩你', correct:true, feedback:'需要袋子就這樣回答，會另外加收袋子費用。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員對客人說的話，客人不會這樣講。' }
        ] },
      { speaker:'店員', emoji:'🧑‍💼', jp:'ポイントカードはお持ちですか？', kana:'ぽいんとかーどはおもちですか', romaji:'pointo kādo wa omochi desu ka', zh:'請問有集點卡嗎？',
        choices:[
          { jp:'いいえ、持っていません', kana:'いいえ、もっていません', zh:'沒有', correct:true, feedback:'觀光客通常沒有，直接說「持っていません」即可。' },
          { jp:'はい、どうぞ', kana:'はい、どうぞ', zh:'有，請（遞出卡片）', correct:true, feedback:'有卡的話一邊遞卡一邊說「どうぞ」。' },
          { jp:'おはようございます', kana:'おはようございます', zh:'早安', correct:false, feedback:'這是打招呼用語，不是回答有沒有集點卡。' }
        ] },
      { speaker:'店員', emoji:'🧑‍💼', jp:'お会計、680円です。', kana:'おかいけい、ろっぴゃくはちじゅうえんです', romaji:'okaikei, roppyaku hachijū en desu', zh:'總共 680 圓。',
        choices:[
          { jp:'カードでお願いします', kana:'かーどでおねがいします', zh:'我要刷卡', correct:true, feedback:'「〜でお願いします」可以指定付款方式。' },
          { jp:'現金でお願いします', kana:'げんきんでおねがいします', zh:'我付現金', correct:true, feedback:'付現金時把錢放在托盤上就好。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待（吃飽了）', correct:false, feedback:'「ごちそうさま」是吃完飯後說的，結帳時不適用。' }
        ] }
    ]},
    { title:'找東西・要筷子', steps:[
      { speaker:'店員', emoji:'🧑‍💼', jp:'いらっしゃいませ。', kana:'いらっしゃいませ', romaji:'irasshaimase', zh:'歡迎光臨。',
        choices:[
          { jp:'すみません、水はどこですか？', kana:'すみません、みずはどこですか', zh:'不好意思，水在哪裡？', correct:true, feedback:'「すみません」先引起注意，再用「〜はどこですか」問位置。' },
          { jp:'すみません、トイレはどこですか？', kana:'すみません、といれはどこですか', zh:'不好意思，廁所在哪裡？', correct:true, feedback:'很多便利商店可以借廁所，記得先問一聲。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'客人不需要回「いらっしゃいませ」，那是店員的台詞。' }
        ] },
      { speaker:'店員', emoji:'🧑‍💼', jp:'あちらの冷蔵庫にございます。', kana:'あちらのれいぞうこにございます', romaji:'achira no reizōko ni gozaimasu', zh:'在那邊的冰箱裡。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝您', correct:true, feedback:'聽到答案後禮貌道謝。' },
          { jp:'わかりました', kana:'わかりました', zh:'我知道了', correct:true, feedback:'表示聽懂了，也很自然。' },
          { jp:'お大事に', kana:'おだいじに', zh:'請保重身體', correct:false, feedback:'「お大事に」是對生病的人說的，這裡用錯了。' }
        ] },
      { speaker:'店員', emoji:'🧑‍💼', jp:'お箸はおつけしますか？', kana:'おはしはおつけしますか', romaji:'ohashi wa otsuke shimasu ka', zh:'需要附筷子嗎？',
        choices:[
          { jp:'はい、お願いします', kana:'はい、おねがいします', zh:'好，麻煩你', correct:true, feedback:'要筷子就說「お願いします」。' },
          { jp:'いいえ、けっこうです', kana:'いいえ、けっこうです', zh:'不用了', correct:true, feedback:'「けっこうです」是比較正式的「不用了」。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'還沒吃呢！這句是吃完才說的。' }
        ] }
    ]}
  ]
},

// ==================== Lv2 拉麵店 ====================
{
  id: 'ramen', name: '拉麵店', icon: '🍜', color: '#c0392b',
  unlockLevel: 2,
  desc: '很多拉麵店要先在門口的售票機買餐券，再把餐券交給店員，學會人數和麵的硬度就能順利吃到！',
  tips: [
    '許多拉麵店入口有「券売機」（售票機），先投錢按按鈕買「食券」，入座後交給店員。',
    '店員可能會問麵的硬度：「かため」偏硬、「ふつう」普通、「やわらかめ」偏軟。',
    '在日本吃麵發出「嘶嘶」的吸麵聲是正常的，不算沒禮貌；博多豚骨拉麵還可以點「替え玉」加麵。'
  ],
  vocab: [
    { jp:'ラーメン', kana:'らーめん', romaji:'rāmen', zh:'拉麵', hint:'諧音：拉～妹恩', emoji:'🍜' },
    { jp:'食券', kana:'しょっけん', romaji:'shokken', zh:'餐券', hint:'諧音：休K恩', emoji:'🎫' },
    { jp:'券売機', kana:'けんばいき', romaji:'kenbaiki', zh:'售票機', hint:'諧音：K恩拜ki', emoji:'🏧' },
    { jp:'醤油', kana:'しょうゆ', romaji:'shōyu', zh:'醬油', hint:'諧音：休～優', emoji:'🫙' },
    { jp:'味噌', kana:'みそ', romaji:'miso', zh:'味噌', hint:'諧音：咪搜', emoji:'🥣' },
    { jp:'塩', kana:'しお', romaji:'shio', zh:'鹽（鹽味）', hint:'諧音：西歐', emoji:'🧂' },
    { jp:'豚骨', kana:'とんこつ', romaji:'tonkotsu', zh:'豚骨（豬骨湯頭）', hint:'諧音：同摳此', emoji:'🐷' },
    { jp:'麺', kana:'めん', romaji:'men', zh:'麵', hint:'諧音：妹恩', emoji:'🍝' },
    { jp:'替え玉', kana:'かえだま', romaji:'kaedama', zh:'加麵', hint:'諧音：卡欸搭媽', emoji:'➕' },
    { jp:'大盛り', kana:'おおもり', romaji:'ōmori', zh:'大碗', hint:'諧音：歐～摸哩', emoji:'⬆️' },
    { jp:'チャーシュー', kana:'ちゃーしゅー', romaji:'chāshū', zh:'叉燒', hint:'諧音：恰～咻～', emoji:'🥩' },
    { jp:'餃子', kana:'ぎょうざ', romaji:'gyōza', zh:'煎餃', hint:'諧音：gyo～紮', emoji:'🥟' },
    { jp:'硬め', kana:'かため', romaji:'katame', zh:'（麵）偏硬', hint:'諧音：卡他妹', emoji:'💪' },
    { jp:'お冷', kana:'おひや', romaji:'ohiya', zh:'冰開水', hint:'諧音：歐hi壓', emoji:'🧊' },
    { jp:'カウンター', kana:'かうんたー', romaji:'kauntā', zh:'吧台座位', hint:'諧音：卡烏恩他～', emoji:'🪑' }
  ],
  phrases: [
    { jp:'一人です', kana:'ひとりです', romaji:'hitori desu', zh:'一個人', hint:'諧音：hi偷哩 爹斯', use:'店員問幾位時' },
    { jp:'食券はどこで買いますか', kana:'しょっけんはどこでかいますか', romaji:'shokken wa doko de kaimasu ka', zh:'餐券在哪裡買？', hint:'諧音：休K恩哇 兜摳爹 卡伊媽斯卡', use:'找不到售票機時' },
    { jp:'麺は硬めでお願いします', kana:'めんはかためでおねがいします', romaji:'men wa katame de onegai shimasu', zh:'麵要偏硬一點', hint:'諧音：妹恩哇 卡他妹爹 歐內嘎伊西媽斯', use:'指定麵的硬度' },
    { jp:'大盛りにできますか', kana:'おおもりにできますか', romaji:'ōmori ni dekimasu ka', zh:'可以改大碗嗎？', hint:'諧音：歐～摸哩尼 爹ki媽斯卡', use:'想吃多一點時' },
    { jp:'替え玉ください', kana:'かえだまください', romaji:'kaedama kudasai', zh:'請幫我加麵', hint:'諧音：卡欸搭媽 哭搭賽', use:'麵吃完、湯還剩下時' },
    { jp:'お冷ください', kana:'おひやください', romaji:'ohiya kudasai', zh:'請給我冰水', hint:'諧音：歐hi壓 哭搭賽', use:'想要水的時候' },
    { jp:'ごちそうさまでした', kana:'ごちそうさまでした', romaji:'gochisōsama deshita', zh:'謝謝招待（我吃飽了）', hint:'諧音：勾七搜～撒媽 爹西他', use:'吃完離開時對店員說' }
  ],
  dialogues: [
    { title:'入店與點餐', steps:[
      { speaker:'店員', emoji:'👨‍🍳', jp:'いらっしゃいませ！何名様ですか？', kana:'いらっしゃいませ！なんめいさまですか', romaji:'irasshaimase! nanmei-sama desu ka', zh:'歡迎光臨！請問幾位？',
        choices:[
          { jp:'一人です', kana:'ひとりです', zh:'一個人', correct:true, feedback:'人數用「ひとり、ふたり、さんにん」來數。' },
          { jp:'二人です', kana:'ふたりです', zh:'兩個人', correct:true, feedback:'和朋友一起去就說「二人です」。' },
          { jp:'一つです', kana:'ひとつです', zh:'一個（東西）', correct:false, feedback:'「一つ」是數東西用的，數人要說「一人（ひとり）」。' }
        ] },
      { speaker:'店員', emoji:'👨‍🍳', jp:'先に食券をお買い求めください。', kana:'さきにしょっけんをおかいもとめください', romaji:'saki ni shokken o okaimotome kudasai', zh:'請先購買餐券。',
        choices:[
          { jp:'はい、わかりました', kana:'はい、わかりました', zh:'好，我知道了', correct:true, feedback:'走到售票機買券就對了。' },
          { jp:'すみません、使い方を教えてください', kana:'すみません、つかいかたをおしえてください', zh:'不好意思，請教我怎麼用', correct:true, feedback:'看不懂售票機時可以這樣請店員幫忙。' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'用餐券的店是「先付錢」，不是吃完才結帳。' }
        ] },
      { speaker:'店員', emoji:'👨‍🍳', jp:'麺の硬さはどうなさいますか？', kana:'めんのかたさはどうなさいますか', romaji:'men no katasa wa dō nasaimasu ka', zh:'麵的硬度要怎麼調整呢？',
        choices:[
          { jp:'普通でお願いします', kana:'ふつうでおねがいします', zh:'普通就好', correct:true, feedback:'不確定的話選「普通」最保險。' },
          { jp:'硬めでお願いします', kana:'かためでおねがいします', zh:'偏硬一點', correct:true, feedback:'喜歡 Q 彈口感就選「硬め」。' },
          { jp:'温めてください', kana:'あたためてください', zh:'請幫我加熱', correct:false, feedback:'這是在便利商店請店員微波便當用的，拉麵本來就是熱的。' }
        ] },
      { speaker:'店員', emoji:'👨‍🍳', jp:'こちらのお席へどうぞ。', kana:'こちらのおせきへどうぞ', romaji:'kochira no oseki e dōzo', zh:'請坐這邊的位子。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'入座時道謝，並把餐券放在吧台上。' },
          { jp:'どういたしまして', kana:'どういたしまして', zh:'不客氣', correct:false, feedback:'「どういたしまして」是別人謝你時才回的。' },
          { jp:'いってきます', kana:'いってきます', zh:'我出門了', correct:false, feedback:'這是出門時對家人說的話。' }
        ] }
    ]},
    { title:'上菜與加麵', steps:[
      { speaker:'店員', emoji:'👨‍🍳', jp:'お待たせしました。豚骨ラーメンです。', kana:'おまたせしました。とんこつらーめんです', romaji:'omatase shimashita. tonkotsu rāmen desu', zh:'讓您久等了，這是豚骨拉麵。',
        choices:[
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:true, feedback:'開動前說「いただきます」，非常道地。' },
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'接過拉麵時道謝也很自然。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'才剛上菜！「ごちそうさま」要吃完再說。' }
        ] },
      { speaker:'店員', emoji:'👨‍🍳', jp:'替え玉はいかがですか？', kana:'かえだまはいかがですか', romaji:'kaedama wa ikaga desu ka', zh:'要加麵嗎？',
        choices:[
          { jp:'替え玉、お願いします', kana:'かえだま、おねがいします', zh:'麻煩加麵', correct:true, feedback:'還沒吃飽就加一球麵，湯要留著喔。' },
          { jp:'いいえ、お腹いっぱいです', kana:'いいえ、おなかいっぱいです', zh:'不用，我吃飽了', correct:true, feedback:'「お腹いっぱい」就是肚子很飽。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員迎接客人的話，不是回答。' }
        ] },
      { speaker:'店員', emoji:'👨‍🍳', jp:'ありがとうございました！', kana:'ありがとうございました', romaji:'arigatō gozaimashita', zh:'謝謝光臨！',
        choices:[
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:true, feedback:'離開時說這句，店員會很開心。' },
          { jp:'おいしかったです', kana:'おいしかったです', zh:'很好吃', correct:true, feedback:'直接稱讚味道，也是很棒的回應。' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'吃完要離開了，應該說「ごちそうさまでした」。' }
        ] }
    ]}
  ]
},

// ==================== Lv3 咖啡廳 ====================
{
  id: 'cafe', name: '咖啡廳', icon: '☕', color: '#8b5a2b',
  unlockLevel: 3,
  desc: '在咖啡廳點飲料：選熱的或冰的、選尺寸、內用還是外帶，一次學會！',
  tips: [
    '日本連鎖咖啡廳常問「店内でお召し上がりですか？」（內用嗎？），外帶說「持ち帰り」或「テイクアウト」。',
    '很多咖啡廳是先在櫃檯點餐付款，再到取餐處拿飲料，有些店要先找好座位。',
    '日本咖啡廳通常可以續坐，但熱門時段請避免久佔座位；部分店家禁止用電腦或限時。'
  ],
  vocab: [
    { jp:'コーヒー', kana:'こーひー', romaji:'kōhī', zh:'咖啡', hint:'諧音：摳～hi～', emoji:'☕' },
    { jp:'カフェラテ', kana:'かふぇらて', romaji:'kafe rate', zh:'拿鐵', hint:'諧音：卡fe拉貼', emoji:'🥛' },
    { jp:'紅茶', kana:'こうちゃ', romaji:'kōcha', zh:'紅茶', hint:'諧音：摳～恰', emoji:'🫖' },
    { jp:'抹茶', kana:'まっちゃ', romaji:'maccha', zh:'抹茶', hint:'諧音：媽～恰', emoji:'🍵' },
    { jp:'ケーキ', kana:'けーき', romaji:'kēki', zh:'蛋糕', hint:'諧音：K～ki', emoji:'🍰' },
    { jp:'ホット', kana:'ほっと', romaji:'hotto', zh:'熱的', hint:'諧音：齁～偷', emoji:'♨️' },
    { jp:'アイス', kana:'あいす', romaji:'aisu', zh:'冰的', hint:'諧音：阿伊斯', emoji:'🧊' },
    { jp:'サイズ', kana:'さいず', romaji:'saizu', zh:'尺寸', hint:'諧音：賽茲', emoji:'📏' },
    { jp:'店内', kana:'てんない', romaji:'tennai', zh:'店內（內用）', hint:'諧音：貼恩奈', emoji:'🏠' },
    { jp:'持ち帰り', kana:'もちかえり', romaji:'mochikaeri', zh:'外帶', hint:'諧音：摸七卡欸哩', emoji:'🥡' },
    { jp:'砂糖', kana:'さとう', romaji:'satō', zh:'砂糖', hint:'諧音：撒偷～', emoji:'🍬' },
    { jp:'ミルク', kana:'みるく', romaji:'miruku', zh:'奶精／牛奶', hint:'諧音：咪嚕哭', emoji:'🥛' },
    { jp:'氷', kana:'こおり', romaji:'kōri', zh:'冰塊', hint:'諧音：摳～哩', emoji:'🧊' },
    { jp:'席', kana:'せき', romaji:'seki', zh:'座位', hint:'諧音：誰ki', emoji:'💺' },
    { jp:'ワイファイ', kana:'わいふぁい', romaji:'waifai', zh:'Wi-Fi 無線網路', hint:'諧音：哇伊fa伊', emoji:'📶' }
  ],
  phrases: [
    { jp:'ホットコーヒーをひとつください', kana:'ほっとこーひーをひとつください', romaji:'hotto kōhī o hitotsu kudasai', zh:'請給我一杯熱咖啡', hint:'諧音：齁偷摳hi歐 hi偷此 哭搭賽', use:'點餐時' },
    { jp:'店内で飲みます', kana:'てんないでのみます', romaji:'tennai de nomimasu', zh:'我要內用', hint:'諧音：貼恩奈爹 諾米媽斯', use:'店員問內用或外帶時' },
    { jp:'持ち帰りでお願いします', kana:'もちかえりでおねがいします', romaji:'mochikaeri de onegai shimasu', zh:'我要外帶', hint:'諧音：摸七卡欸哩爹 歐內嘎伊西媽斯', use:'要帶走時' },
    { jp:'Sサイズでお願いします', kana:'えすさいずでおねがいします', romaji:'esu saizu de onegai shimasu', zh:'我要小杯', hint:'諧音：欸斯賽茲爹 歐內嘎伊西媽斯', use:'指定尺寸' },
    { jp:'氷少なめでお願いします', kana:'こおりすくなめでおねがいします', romaji:'kōri sukuname de onegai shimasu', zh:'冰塊少一點', hint:'諧音：摳哩 斯哭拿妹爹 歐內嘎伊西媽斯', use:'點冰飲時' },
    { jp:'砂糖とミルクは大丈夫です', kana:'さとうとみるくはだいじょうぶです', romaji:'satō to miruku wa daijōbu desu', zh:'不需要糖和奶精', hint:'諧音：撒偷偷 咪嚕哭哇 搭伊糾～布爹斯', use:'喝黑咖啡時' },
    { jp:'Wi-Fiはありますか', kana:'わいふぁいはありますか', romaji:'waifai wa arimasu ka', zh:'有 Wi-Fi 嗎？', hint:'諧音：哇伊fa伊哇 阿哩媽斯卡', use:'想上網時' }
  ],
  dialogues: [
    { title:'點飲料', steps:[
      { speaker:'店員', emoji:'👩‍💼', jp:'いらっしゃいませ。ご注文はお決まりですか？', kana:'いらっしゃいませ。ごちゅうもんはおきまりですか', romaji:'irasshaimase. gochūmon wa okimari desu ka', zh:'歡迎光臨，請問決定好要點什麼了嗎？',
        choices:[
          { jp:'カフェラテをひとつください', kana:'かふぇらてをひとつください', zh:'請給我一杯拿鐵', correct:true, feedback:'「品名＋をひとつください」是最基本的點餐句型。' },
          { jp:'まだです。少し待ってください', kana:'まだです。すこしまってください', zh:'還沒，請稍等', correct:true, feedback:'還沒想好可以請店員等一下。' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'還沒點餐呢，「いただきます」是開動時才說。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'ホットとアイス、どちらになさいますか？', kana:'ほっととあいす、どちらになさいますか', romaji:'hotto to aisu, dochira ni nasaimasu ka', zh:'要熱的還是冰的呢？',
        choices:[
          { jp:'アイスでお願いします', kana:'あいすでおねがいします', zh:'冰的', correct:true, feedback:'「アイス」就是冰的。' },
          { jp:'ホットでお願いします', kana:'ほっとでおねがいします', zh:'熱的', correct:true, feedback:'「ホット」就是熱的。' },
          { jp:'温めてください', kana:'あたためてください', zh:'請幫我加熱', correct:false, feedback:'「温めて」是請店員加熱食物（如便當），選飲料溫度要說「ホット」。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'サイズはいかがなさいますか？', kana:'さいずはいかがなさいますか', romaji:'saizu wa ikaga nasaimasu ka', zh:'尺寸要哪一種呢？',
        choices:[
          { jp:'Mサイズでお願いします', kana:'えむさいずでおねがいします', zh:'我要中杯', correct:true, feedback:'S、M、L 在日本念「えす、えむ、える」。' },
          { jp:'大盛りでお願いします', kana:'おおもりでおねがいします', zh:'我要大碗', correct:false, feedback:'「大盛り」是飯、麵的大份量，飲料要說「Lサイズ」。' },
          { jp:'一人です', kana:'ひとりです', zh:'一個人', correct:false, feedback:'這是回答人數，不是回答尺寸。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'店内でお召し上がりですか？', kana:'てんないでおめしあがりですか', romaji:'tennai de omeshiagari desu ka', zh:'請問是內用嗎？',
        choices:[
          { jp:'はい、店内で', kana:'はい、てんないで', zh:'對，內用', correct:true, feedback:'內用就簡單回答「店内で」。' },
          { jp:'いいえ、持ち帰りで', kana:'いいえ、もちかえりで', zh:'不，外帶', correct:true, feedback:'外帶說「持ち帰り」，也可以說「テイクアウト」。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'這是吃完後說的，跟內用外帶無關。' }
        ] }
    ]},
    { title:'取餐與找座位', steps:[
      { speaker:'店員', emoji:'👩‍💼', jp:'お砂糖とミルクはお使いになりますか？', kana:'おさとうとみるくはおつかいになりますか', romaji:'osatō to miruku wa otsukai ni narimasu ka', zh:'需要砂糖和奶精嗎？',
        choices:[
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'喝黑咖啡就禮貌拒絕。' },
          { jp:'ミルクだけお願いします', kana:'みるくだけおねがいします', zh:'只要奶精', correct:true, feedback:'「〜だけ」是「只要～」。' },
          { jp:'お釣りください', kana:'おつりください', zh:'請找錢', correct:false, feedback:'店員問的是糖和奶精，不是找零。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'お待たせいたしました。アイスカフェラテです。', kana:'おまたせいたしました。あいすかふぇらてです', romaji:'omatase itashimashita. aisu kafe rate desu', zh:'讓您久等了，這是冰拿鐵。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'接過飲料時道謝。' },
          { jp:'どうも', kana:'どうも', zh:'謝啦', correct:true, feedback:'「どうも」是簡短的謝謝，日常很常用。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員的台詞，客人不會說。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'何かお困りですか？', kana:'なにかおこまりですか', romaji:'nanika okomari desu ka', zh:'有什麼需要幫忙的嗎？',
        choices:[
          { jp:'この席、空いていますか？', kana:'このせき、あいていますか', zh:'這個位子有人坐嗎？', correct:true, feedback:'「空いていますか」問座位是否空著。' },
          { jp:'Wi-Fiのパスワードを教えてください', kana:'わいふぁいのぱすわーどをおしえてください', zh:'請告訴我 Wi-Fi 密碼', correct:true, feedback:'「〜を教えてください」是請對方告訴你資訊。' },
          { jp:'食券はどこで買いますか？', kana:'しょっけんはどこでかいますか', zh:'餐券在哪裡買？', correct:false, feedback:'一般咖啡廳是在櫃檯點餐，餐券多用在拉麵店、定食店。' }
        ] }
    ]}
  ]
},

// ==================== Lv4 藥妝店 ====================
{
  id: 'drugstore', name: '藥妝店', icon: '💊', color: '#d63384',
  unlockLevel: 4,
  desc: '買藥、買保養品、辦免稅！學會找商品、說明症狀和免稅結帳。',
  tips: [
    '同一家店單日消費滿 5,000 圓（未稅）通常可以辦免稅，一定要帶護照本人到場。',
    '日本藥品分等級，「第1類医薬品」需要藥劑師說明才能購買，櫃檯人員可能會問你幾個問題。',
    '藥妝店常有「テスター」（試用品），可以先試擦再買；店員會問有沒有集點卡。'
  ],
  vocab: [
    { jp:'薬', kana:'くすり', romaji:'kusuri', zh:'藥', hint:'諧音：哭斯哩', emoji:'💊' },
    { jp:'風邪薬', kana:'かぜぐすり', romaji:'kazegusuri', zh:'感冒藥', hint:'諧音：卡賊估斯哩', emoji:'🤧' },
    { jp:'頭痛薬', kana:'ずつうやく', romaji:'zutsūyaku', zh:'頭痛藥', hint:'諧音：茲此～壓哭', emoji:'🤕' },
    { jp:'胃薬', kana:'いぐすり', romaji:'igusuri', zh:'胃藥', hint:'諧音：伊估斯哩', emoji:'🫃' },
    { jp:'目薬', kana:'めぐすり', romaji:'megusuri', zh:'眼藥水', hint:'諧音：妹估斯哩', emoji:'👁️' },
    { jp:'絆創膏', kana:'ばんそうこう', romaji:'bansōkō', zh:'OK 繃', hint:'諧音：棒搜～摳～', emoji:'🩹' },
    { jp:'湿布', kana:'しっぷ', romaji:'shippu', zh:'痠痛貼布', hint:'諧音：西～噗', emoji:'🩼' },
    { jp:'マスク', kana:'ますく', romaji:'masuku', zh:'口罩', hint:'諧音：媽斯哭', emoji:'😷' },
    { jp:'化粧水', kana:'けしょうすい', romaji:'keshōsui', zh:'化妝水', hint:'諧音：K休～斯伊', emoji:'🧴' },
    { jp:'日焼け止め', kana:'ひやけどめ', romaji:'hiyakedome', zh:'防曬乳', hint:'諧音：hi壓K兜妹', emoji:'☀️' },
    { jp:'テスター', kana:'てすたー', romaji:'tesutā', zh:'試用品', hint:'諧音：貼斯他～', emoji:'🧪' },
    { jp:'免税', kana:'めんぜい', romaji:'menzei', zh:'免稅', hint:'諧音：妹恩賊～', emoji:'🧾' },
    { jp:'パスポート', kana:'ぱすぽーと', romaji:'pasupōto', zh:'護照', hint:'諧音：趴斯剖～偷', emoji:'🛂' },
    { jp:'割引', kana:'わりびき', romaji:'waribiki', zh:'折扣', hint:'諧音：哇哩逼ki', emoji:'🏷️' }
  ],
  phrases: [
    { jp:'目薬はどこにありますか', kana:'めぐすりはどこにありますか', romaji:'megusuri wa doko ni arimasu ka', zh:'眼藥水在哪裡？', hint:'諧音：妹估斯哩哇 兜摳尼 阿哩媽斯卡', use:'找商品時（可替換品名）' },
    { jp:'これと同じものはありますか', kana:'これとおなじものはありますか', romaji:'kore to onaji mono wa arimasu ka', zh:'有跟這個一樣的嗎？', hint:'諧音：摳勒偷 歐拿基摸諾哇 阿哩媽斯卡', use:'拿手機照片給店員看時' },
    { jp:'おすすめはどれですか', kana:'おすすめはどれですか', romaji:'osusume wa dore desu ka', zh:'推薦哪一個？', hint:'諧音：歐斯斯妹哇 兜勒爹斯卡', use:'不知道買哪個時' },
    { jp:'試してもいいですか', kana:'ためしてもいいですか', romaji:'tameshite mo ii desu ka', zh:'可以試用嗎？', hint:'諧音：他妹西貼摸 伊～爹斯卡', use:'想試擦化妝品時' },
    { jp:'頭が痛いです', kana:'あたまがいたいです', romaji:'atama ga itai desu', zh:'我頭痛', hint:'諧音：阿他媽嘎 伊他伊爹斯', use:'向藥劑師說明症狀' },
    { jp:'一日何回飲みますか', kana:'いちにちなんかいのみますか', romaji:'ichinichi nankai nomimasu ka', zh:'一天吃幾次？', hint:'諧音：伊七尼七 難卡伊 諾米媽斯卡', use:'確認藥的用法' },
    { jp:'免税できますか', kana:'めんぜいできますか', romaji:'menzei dekimasu ka', zh:'可以免稅嗎？', hint:'諧音：妹恩賊～ 爹ki媽斯卡', use:'結帳前確認' }
  ],
  dialogues: [
    { title:'找商品', steps:[
      { speaker:'店員', emoji:'👩‍⚕️', jp:'何かお探しですか？', kana:'なにかおさがしですか', romaji:'nanika osagashi desu ka', zh:'請問在找什麼嗎？',
        choices:[
          { jp:'目薬はどこにありますか？', kana:'めぐすりはどこにありますか', zh:'眼藥水在哪裡？', correct:true, feedback:'「〜はどこにありますか」問商品位置。' },
          { jp:'日焼け止めを探しています', kana:'ひやけどめをさがしています', zh:'我在找防曬乳', correct:true, feedback:'「〜を探しています」＝我在找～。' },
          { jp:'おかえりなさい', kana:'おかえりなさい', zh:'歡迎回家', correct:false, feedback:'這是家人回家時說的話，用錯場合了。' }
        ] },
      { speaker:'店員', emoji:'👩‍⚕️', jp:'目薬でしたら、こちらの棚にございます。', kana:'めぐすりでしたら、こちらのたなにございます', romaji:'megusuri deshitara, kochira no tana ni gozaimasu', zh:'眼藥水的話，在這邊的架子上。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'被帶路後禮貌道謝。' },
          { jp:'おすすめはどれですか？', kana:'おすすめはどれですか', zh:'推薦哪一個？', correct:true, feedback:'種類太多時直接請店員推薦。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'這是吃完飯才說的，藥妝店用不到。' }
        ] },
      { speaker:'店員', emoji:'👩‍⚕️', jp:'こちらが一番人気です。', kana:'こちらがいちばんにんきです', romaji:'kochira ga ichiban ninki desu', zh:'這款最受歡迎。',
        choices:[
          { jp:'じゃあ、これを二つください', kana:'じゃあ、これをふたつください', zh:'那請給我兩個', correct:true, feedback:'「二つ（ふたつ）」是兩個，數東西用。' },
          { jp:'もう少し安いものはありますか？', kana:'もうすこしやすいものはありますか', zh:'有便宜一點的嗎？', correct:true, feedback:'「もう少し〜」＝再～一點，很好用。' },
          { jp:'温めてください', kana:'あたためてください', zh:'請幫我加熱', correct:false, feedback:'這是便利商店加熱便當用的，眼藥水不用加熱！' }
        ] }
    ]},
    { title:'說明症狀', steps:[
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'どうされましたか？', kana:'どうされましたか', romaji:'dō saremashita ka', zh:'請問怎麼了？',
        choices:[
          { jp:'頭が痛いです', kana:'あたまがいたいです', zh:'我頭痛', correct:true, feedback:'「部位＋が痛いです」說明哪裡痛。' },
          { jp:'喉が痛いです', kana:'のどがいたいです', zh:'我喉嚨痛', correct:true, feedback:'「喉（のど）」是喉嚨。' },
          { jp:'お腹いっぱいです', kana:'おなかいっぱいです', zh:'我吃飽了', correct:false, feedback:'這是「肚子很飽」，不是症狀；肚子痛要說「お腹が痛いです」。' }
        ] },
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'こちらの薬はいかがですか？一日三回、食後に飲んでください。', kana:'こちらのくすりはいかがですか？いちにちさんかい、しょくごにのんでください', romaji:'kochira no kusuri wa ikaga desu ka? ichinichi sankai, shokugo ni nonde kudasai', zh:'這款藥如何？一天三次，飯後服用。',
        choices:[
          { jp:'一回何錠ですか？', kana:'いっかいなんじょうですか', zh:'一次吃幾顆？', correct:true, feedback:'「錠（じょう）」是藥錠的量詞。' },
          { jp:'わかりました、これにします', kana:'わかりました、これにします', zh:'了解，我買這個', correct:true, feedback:'「これにします」＝我決定要這個。' },
          { jp:'替え玉ください', kana:'かえだまください', zh:'請幫我加麵', correct:false, feedback:'這是拉麵店加麵用的，跟買藥無關。' }
        ] },
      { speaker:'藥劑師', emoji:'🧑‍⚕️', jp:'お大事に。', kana:'おだいじに', romaji:'odaiji ni', zh:'請多保重。',
        choices:[
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'對方關心你的身體，回答謝謝即可。' },
          { jp:'お大事に', kana:'おだいじに', zh:'請保重', correct:false, feedback:'「お大事に」是對病人說的，生病的是你，應該回謝謝。' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的，不是回應關心。' }
        ] }
    ]},
    { title:'免稅結帳', steps:[
      { speaker:'店員', emoji:'👩‍💼', jp:'ポイントカードはお持ちですか？', kana:'ぽいんとかーどはおもちですか', romaji:'pointo kādo wa omochi desu ka', zh:'請問有集點卡嗎？',
        choices:[
          { jp:'持っていません', kana:'もっていません', zh:'沒有', correct:true, feedback:'沒有卡就這樣回答。' },
          { jp:'作れますか？', kana:'つくれますか', zh:'可以辦一張嗎？', correct:true, feedback:'常來的話可以問能不能辦卡。' },
          { jp:'お箸をください', kana:'おはしをください', zh:'請給我筷子', correct:false, feedback:'藥妝店不會附筷子，答非所問。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'こちらの商品、免税になさいますか？', kana:'こちらのしょうひん、めんぜいになさいますか', romaji:'kochira no shōhin, menzei ni nasaimasu ka', zh:'這些商品要辦免稅嗎？',
        choices:[
          { jp:'はい、お願いします', kana:'はい、おねがいします', zh:'好，麻煩了', correct:true, feedback:'要免稅就說「お願いします」。' },
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'免稅品會被封袋、出境前不能拆，想馬上用就可以不辦。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員說的話，不是回答。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'パスポートをお見せいただけますか？', kana:'ぱすぽーとをおみせいただけますか', romaji:'pasupōto o omise itadakemasu ka', zh:'可以出示您的護照嗎？',
        choices:[
          { jp:'はい、どうぞ', kana:'はい、どうぞ', zh:'好，請看', correct:true, feedback:'遞出護照時說「どうぞ」。' },
          { jp:'ポイントカードです', kana:'ぽいんとかーどです', zh:'這是集點卡', correct:false, feedback:'免稅一定要護照，集點卡不能代替。' },
          { jp:'いいえ、けっこうです', kana:'いいえ、けっこうです', zh:'不用了', correct:false, feedback:'不出示護照就無法辦免稅喔。' }
        ] },
      { speaker:'店員', emoji:'👩‍💼', jp:'免税品は日本国内で開けないでください。', kana:'めんぜいひんはにほんこくないであけないでください', romaji:'menzeihin wa Nihon kokunai de akenaide kudasai', zh:'免稅品請不要在日本境內拆封。',
        choices:[
          { jp:'わかりました', kana:'わかりました', zh:'我知道了', correct:true, feedback:'表示理解規定。' },
          { jp:'はい、気をつけます', kana:'はい、きをつけます', zh:'好，我會注意', correct:true, feedback:'「気をつけます」＝我會小心注意。' },
          { jp:'今開けてもいいですか？', kana:'いまあけてもいいですか', zh:'現在可以打開嗎？', correct:false, feedback:'店員剛說不能拆，拆了出境時可能要補稅。' }
        ] }
    ]}
  ]
},

// ==================== Lv5 居酒屋・餐廳 ====================
{
  id: 'izakaya', name: '居酒屋・餐廳', icon: '🏮', color: '#e67e22',
  unlockLevel: 5,
  desc: '和朋友去居酒屋！從入店、點酒點菜到分開結帳，體驗日本人下班後的熱鬧氣氛。',
  tips: [
    '居酒屋入座後常會先送上一小盤「お通し」（開胃小菜），這是座位費的一部分，會算在帳單裡。',
    '日本人第一杯常說「とりあえず生（なま）」＝先來杯生啤酒；大家都拿到飲料後一起說「乾杯！」才開始喝。',
    '要叫店員就舉手說「すみません！」；很多店不接受分開結帳，最好先由一人付再私下分攤。'
  ],
  vocab: [
    { jp:'生ビール', kana:'なまびーる', romaji:'nama bīru', zh:'生啤酒', hint:'諧音：拿媽逼～嚕', emoji:'🍺' },
    { jp:'日本酒', kana:'にほんしゅ', romaji:'nihonshu', zh:'日本清酒', hint:'諧音：尼齁恩咻', emoji:'🍶' },
    { jp:'ソフトドリンク', kana:'そふとどりんく', romaji:'sofuto dorinku', zh:'無酒精飲料', hint:'諧音：搜夫偷 兜令哭', emoji:'🧃' },
    { jp:'乾杯', kana:'かんぱい', romaji:'kanpai', zh:'乾杯', hint:'諧音：看排', emoji:'🥂' },
    { jp:'お通し', kana:'おとおし', romaji:'otōshi', zh:'開胃小菜（座位費）', hint:'諧音：歐偷～西', emoji:'🥗' },
    { jp:'枝豆', kana:'えだまめ', romaji:'edamame', zh:'毛豆', hint:'諧音：欸搭媽妹', emoji:'🫛' },
    { jp:'焼き鳥', kana:'やきとり', romaji:'yakitori', zh:'烤雞肉串', hint:'諧音：壓ki偷哩', emoji:'🍢' },
    { jp:'唐揚げ', kana:'からあげ', romaji:'karaage', zh:'日式炸雞', hint:'諧音：卡拉阿給', emoji:'🍗' },
    { jp:'刺身', kana:'さしみ', romaji:'sashimi', zh:'生魚片', hint:'諧音：撒西咪', emoji:'🐟' },
    { jp:'メニュー', kana:'めにゅー', romaji:'menyū', zh:'菜單', hint:'諧音：妹扭～', emoji:'📋' },
    { jp:'おすすめ', kana:'おすすめ', romaji:'osusume', zh:'推薦', hint:'諧音：歐斯斯妹', emoji:'👍' },
    { jp:'飲み放題', kana:'のみほうだい', romaji:'nomihōdai', zh:'喝到飽', hint:'諧音：諾米齁～搭伊', emoji:'♾️' },
    { jp:'予約', kana:'よやく', romaji:'yoyaku', zh:'預約', hint:'諧音：優壓哭', emoji:'📅' },
    { jp:'個室', kana:'こしつ', romaji:'koshitsu', zh:'包廂', hint:'諧音：摳西此', emoji:'🚪' },
    { jp:'お会計', kana:'おかいけい', romaji:'okaikei', zh:'結帳', hint:'諧音：歐卡伊K～', emoji:'💰' }
  ],
  phrases: [
    { jp:'予約していません', kana:'よやくしていません', romaji:'yoyaku shite imasen', zh:'我沒有預約', hint:'諧音：優壓哭 西貼伊媽森', use:'店員問有沒有訂位時' },
    { jp:'生ビールを二つください', kana:'なまびーるをふたつください', romaji:'nama bīru o futatsu kudasai', zh:'請給我兩杯生啤酒', hint:'諧音：拿媽逼嚕歐 夫他此 哭搭賽', use:'點飲料時' },
    { jp:'おすすめは何ですか', kana:'おすすめはなんですか', romaji:'osusume wa nan desu ka', zh:'推薦什麼呢？', hint:'諧音：歐斯斯妹哇 難爹斯卡', use:'不知道點什麼時' },
    { jp:'英語のメニューはありますか', kana:'えいごのめにゅーはありますか', romaji:'eigo no menyū wa arimasu ka', zh:'有英文菜單嗎？', hint:'諧音：欸～勾諾 妹扭哇 阿哩媽斯卡', use:'看不懂菜單時' },
    { jp:'禁煙席はありますか', kana:'きんえんせきはありますか', romaji:'kin\'en seki wa arimasu ka', zh:'有禁菸座位嗎？', hint:'諧音：king欸恩誰ki哇 阿哩媽斯卡', use:'入店時' },
    { jp:'乾杯！', kana:'かんぱい！', romaji:'kanpai!', zh:'乾杯！', hint:'諧音：看排！', use:'大家都拿到飲料後一起舉杯' },
    { jp:'お会計お願いします', kana:'おかいけいおねがいします', romaji:'okaikei onegai shimasu', zh:'麻煩結帳', hint:'諧音：歐卡伊K～ 歐內嘎伊西媽斯', use:'吃完要結帳時' },
    { jp:'別々に払えますか', kana:'べつべつにはらえますか', romaji:'betsubetsu ni haraemasu ka', zh:'可以分開付嗎？', hint:'諧音：貝此貝此尼 哈拉欸媽斯卡', use:'想各付各的時' }
  ],
  dialogues: [
    { title:'入店與點飲料', steps:[
      { speaker:'店員', emoji:'🙋‍♂️', jp:'いらっしゃいませ！ご予約のお客様ですか？', kana:'いらっしゃいませ！ごよやくのおきゃくさまですか', romaji:'irasshaimase! goyoyaku no okyaku-sama desu ka', zh:'歡迎光臨！請問有預約嗎？',
        choices:[
          { jp:'いいえ、予約していません', kana:'いいえ、よやくしていません', zh:'沒有，我們沒預約', correct:true, feedback:'沒訂位就這樣說，店員會看有沒有空位。' },
          { jp:'はい、林で予約しています', kana:'はい、りんでよやくしています', zh:'有，用「林」的名字預約', correct:true, feedback:'「姓氏＋で予約しています」是報訂位名字的說法。' },
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:false, feedback:'才剛進門，這句是吃完要走時說的。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'何名様ですか？', kana:'なんめいさまですか', romaji:'nanmei-sama desu ka', zh:'請問幾位？',
        choices:[
          { jp:'三人です', kana:'さんにんです', zh:'三個人', correct:true, feedback:'三個人以上用「數字＋人（にん）」。' },
          { jp:'三つです', kana:'みっつです', zh:'三個（東西）', correct:false, feedback:'「三つ」是數東西，數人要說「三人（さんにん）」。' },
          { jp:'三階です', kana:'さんがいです', zh:'三樓', correct:false, feedback:'「三階」是樓層，不是人數。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'カウンターとテーブル、どちらがよろしいですか？', kana:'かうんたーとてーぶる、どちらがよろしいですか', romaji:'kauntā to tēburu, dochira ga yoroshii desu ka', zh:'吧台和桌位，您想要哪一種？',
        choices:[
          { jp:'テーブルでお願いします', kana:'てーぶるでおねがいします', zh:'我們要桌位', correct:true, feedback:'人多坐桌位比較方便聊天。' },
          { jp:'カウンターで大丈夫です', kana:'かうんたーでだいじょうぶです', zh:'吧台也可以', correct:true, feedback:'「〜で大丈夫です」＝～就可以了。' },
          { jp:'持ち帰りでお願いします', kana:'もちかえりでおねがいします', zh:'我要外帶', correct:false, feedback:'店員問的是座位，不是內用外帶。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'お飲み物は何になさいますか？', kana:'おのみものはなにになさいますか', romaji:'onomimono wa nani ni nasaimasu ka', zh:'飲料要點什麼呢？',
        choices:[
          { jp:'とりあえず生ビールを三つ', kana:'とりあえずなまびーるをみっつ', zh:'先來三杯生啤酒', correct:true, feedback:'「とりあえず」＝總之先～，居酒屋超常用。' },
          { jp:'ウーロン茶をください', kana:'うーろんちゃをください', zh:'請給我烏龍茶', correct:true, feedback:'不喝酒也完全沒問題，烏龍茶是常見選擇。' },
          { jp:'乾杯！', kana:'かんぱい！', zh:'乾杯！', correct:false, feedback:'飲料都還沒來呢！等大家拿到杯子再乾杯。' }
        ] }
    ]},
    { title:'點菜', steps:[
      { speaker:'店員', emoji:'🙋‍♂️', jp:'はい、お伺いします。', kana:'はい、おうかがいします', romaji:'hai, oukagai shimasu', zh:'好的，請說（我來為您點餐）。',
        choices:[
          { jp:'おすすめは何ですか？', kana:'おすすめはなんですか', zh:'推薦什麼呢？', correct:true, feedback:'問店員推薦，常能吃到當季好料。' },
          { jp:'焼き鳥の盛り合わせをください', kana:'やきとりのもりあわせをください', zh:'請給我烤雞串拼盤', correct:true, feedback:'「盛り合わせ」是綜合拼盤，一次吃多種口味。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員迎客的話，客人不會說。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'本日のおすすめは刺身の盛り合わせです。', kana:'ほんじつのおすすめはさしみのもりあわせです', romaji:'honjitsu no osusume wa sashimi no moriawase desu', zh:'今天推薦的是生魚片拼盤。',
        choices:[
          { jp:'じゃあ、それをお願いします', kana:'じゃあ、それをおねがいします', zh:'那就點那個', correct:true, feedback:'「それ」指對方剛說的東西。' },
          { jp:'すみません、生の魚は苦手です', kana:'すみません、なまのさかなはにがてです', zh:'不好意思，我不太敢吃生魚', correct:true, feedback:'「苦手（にがて）」＝不擅長、不太敢吃，委婉又禮貌。' },
          { jp:'お大事に', kana:'おだいじに', zh:'請保重', correct:false, feedback:'這是對生病的人說的，點菜時用不到。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'ご注文は以上でよろしいですか？', kana:'ごちゅうもんはいじょうでよろしいですか', romaji:'gochūmon wa ijō de yoroshii desu ka', zh:'您的點餐就這些嗎？',
        choices:[
          { jp:'はい、以上です', kana:'はい、いじょうです', zh:'對，就這些', correct:true, feedback:'「以上です」＝就這些了。' },
          { jp:'あと、枝豆もください', kana:'あと、えだまめもください', zh:'還有，也要毛豆', correct:true, feedback:'「あと」＝還有，用來追加點餐。' },
          { jp:'お会計お願いします', kana:'おかいけいおねがいします', zh:'麻煩結帳', correct:false, feedback:'才剛點完菜，吃完再結帳。' }
        ] }
    ]},
    { title:'結帳', steps:[
      { speaker:'店員', emoji:'🙋‍♂️', jp:'お会計、三名様で9,600円です。', kana:'おかいけい、さんめいさまできゅうせんろっぴゃくえんです', romaji:'okaikei, sanmei-sama de kyūsen roppyaku en desu', zh:'三位總共 9,600 圓。',
        choices:[
          { jp:'カードで払えますか？', kana:'かーどではらえますか', zh:'可以刷卡嗎？', correct:true, feedback:'有些小居酒屋只收現金，先確認比較保險。' },
          { jp:'別々に払えますか？', kana:'べつべつにはらえますか', zh:'可以分開付嗎？', correct:true, feedback:'想各付各的就這樣問。' },
          { jp:'免税できますか？', kana:'めんぜいできますか', zh:'可以免稅嗎？', correct:false, feedback:'在店內吃喝的餐飲不能免稅，免稅是購物用的。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'申し訳ございません、お会計はご一緒にお願いしております。', kana:'もうしわけございません、おかいけいはごいっしょにおねがいしております', romaji:'mōshiwake gozaimasen, okaikei wa goissho ni onegai shite orimasu', zh:'非常抱歉，結帳需要一起付。',
        choices:[
          { jp:'わかりました、一緒に払います', kana:'わかりました、いっしょにはらいます', zh:'好，一起付', correct:true, feedback:'先一起付，之後朋友間再分攤。' },
          { jp:'じゃあ、現金でお願いします', kana:'じゃあ、げんきんでおねがいします', zh:'那我付現金', correct:true, feedback:'「じゃあ」＝那麼，接著說決定。' },
          { jp:'いただきます', kana:'いただきます', zh:'我開動了', correct:false, feedback:'這是吃飯前說的，結帳時用錯了。' }
        ] },
      { speaker:'店員', emoji:'🙋‍♂️', jp:'ありがとうございました！またお越しくださいませ。', kana:'ありがとうございました！またおこしくださいませ', romaji:'arigatō gozaimashita! mata okoshi kudasaimase', zh:'謝謝光臨！歡迎再來。',
        choices:[
          { jp:'ごちそうさまでした', kana:'ごちそうさまでした', zh:'謝謝招待', correct:true, feedback:'離開餐廳時說這句最道地。' },
          { jp:'おいしかったです', kana:'おいしかったです', zh:'很好吃', correct:true, feedback:'稱讚料理，店員會很高興。' },
          { jp:'いらっしゃいませ', kana:'いらっしゃいませ', zh:'歡迎光臨', correct:false, feedback:'這是店員的台詞，客人要離開時不會說。' }
        ] }
    ]}
  ]
},

// ==================== Lv6 服飾店 ====================
{
  id: 'clothes', name: '服飾店', icon: '👕', color: '#6f42c1',
  unlockLevel: 6,
  desc: '在日本逛街買衣服：婉拒店員搭話、要求試穿、換尺寸、換顏色，最後辦免稅！',
  tips: [
    '進試衣間前要脫鞋，有些店會提供「フェイスカバー」（防妝面罩），試穿上衣時要戴上以免沾到化妝品。',
    '店員熱情搭話時，只想自己逛可以說「ちょっと見ているだけです」，店員就不會一直跟著。',
    '日本尺寸普遍比歐美小一號，買之前最好先試穿；同店單日消費滿 5,000 圓（未稅）可辦免稅。'
  ],
  vocab: [
    { jp:'服', kana:'ふく', romaji:'fuku', zh:'衣服', hint:'諧音：夫哭', emoji:'👚' },
    { jp:'シャツ', kana:'しゃつ', romaji:'shatsu', zh:'襯衫', hint:'諧音：蝦此', emoji:'👔' },
    { jp:'ズボン', kana:'ずぼん', romaji:'zubon', zh:'褲子', hint:'諧音：茲棒', emoji:'👖' },
    { jp:'スカート', kana:'すかーと', romaji:'sukāto', zh:'裙子', hint:'諧音：斯卡～偷', emoji:'👗' },
    { jp:'ワンピース', kana:'わんぴーす', romaji:'wanpīsu', zh:'連身洋裝', hint:'諧音：彎披～斯', emoji:'👗' },
    { jp:'靴', kana:'くつ', romaji:'kutsu', zh:'鞋子', hint:'諧音：哭此', emoji:'👟' },
    { jp:'帽子', kana:'ぼうし', romaji:'bōshi', zh:'帽子', hint:'諧音：剝～西', emoji:'🧢' },
    { jp:'色', kana:'いろ', romaji:'iro', zh:'顏色', hint:'諧音：伊囉', emoji:'🎨' },
    { jp:'大きい', kana:'おおきい', romaji:'ōkii', zh:'大的', hint:'諧音：歐～ki～', emoji:'🔼' },
    { jp:'小さい', kana:'ちいさい', romaji:'chiisai', zh:'小的', hint:'諧音：七～賽', emoji:'🔽' },
    { jp:'試着室', kana:'しちゃくしつ', romaji:'shichakushitsu', zh:'試衣間', hint:'諧音：西恰哭西此', emoji:'🚪' },
    { jp:'試着', kana:'しちゃく', romaji:'shichaku', zh:'試穿', hint:'諧音：西恰哭', emoji:'🪞' },
    { jp:'セール', kana:'せーる', romaji:'sēru', zh:'特價', hint:'諧音：誰～嚕', emoji:'🏷️' },
    { jp:'値札', kana:'ねふだ', romaji:'nefuda', zh:'價格標籤', hint:'諧音：內夫搭', emoji:'🔖' },
    { jp:'似合う', kana:'にあう', romaji:'niau', zh:'適合、好看', hint:'諧音：尼阿烏', emoji:'✨' }
  ],
  phrases: [
    { jp:'ちょっと見ているだけです', kana:'ちょっとみているだけです', romaji:'chotto mite iru dake desu', zh:'我只是看看', hint:'諧音：秋偷 咪貼伊嚕 搭K爹斯', use:'店員搭話但想自己逛時' },
    { jp:'試着してもいいですか', kana:'しちゃくしてもいいですか', romaji:'shichaku shite mo ii desu ka', zh:'可以試穿嗎？', hint:'諧音：西恰哭 西貼摸 伊～爹斯卡', use:'想試穿時' },
    { jp:'もう少し大きいサイズはありますか', kana:'もうすこしおおきいさいずはありますか', romaji:'mō sukoshi ōkii saizu wa arimasu ka', zh:'有再大一點的尺寸嗎？', hint:'諧音：摸～斯摳西 歐～ki～賽茲哇 阿哩媽斯卡', use:'衣服太小時' },
    { jp:'ほかの色はありますか', kana:'ほかのいろはありますか', romaji:'hoka no iro wa arimasu ka', zh:'有其他顏色嗎？', hint:'諧音：齁卡諾 伊囉哇 阿哩媽斯卡', use:'想換顏色時' },
    { jp:'これはセール品ですか', kana:'これはせーるひんですか', romaji:'kore wa sēruhin desu ka', zh:'這是特價品嗎？', hint:'諧音：摳勒哇 誰～嚕hin爹斯卡', use:'確認是否有折扣' },
    { jp:'ちょっと考えます', kana:'ちょっとかんがえます', romaji:'chotto kangaemasu', zh:'我再考慮一下', hint:'諧音：秋偷 看嘎欸媽斯', use:'委婉表示先不買' },
    { jp:'これにします', kana:'これにします', romaji:'kore ni shimasu', zh:'我決定買這個', hint:'諧音：摳勒尼 西媽斯', use:'決定購買時' }
  ],
  dialogues: [
    { title:'逛街與試穿', steps:[
      { speaker:'店員', emoji:'💁‍♀️', jp:'いらっしゃいませ。何かお探しですか？', kana:'いらっしゃいませ。なにかおさがしですか', romaji:'irasshaimase. nanika osagashi desu ka', zh:'歡迎光臨，請問在找什麼嗎？',
        choices:[
          { jp:'ちょっと見ているだけです', kana:'ちょっとみているだけです', zh:'我只是看看', correct:true, feedback:'想自己慢慢逛就這樣說，很自然。' },
          { jp:'白いシャツを探しています', kana:'しろいしゃつをさがしています', zh:'我在找白襯衫', correct:true, feedback:'「顏色＋品項＋を探しています」直接說需求。' },
          { jp:'ちょっと考えます', kana:'ちょっとかんがえます', zh:'我再考慮一下', correct:false, feedback:'這是看完商品後委婉不買時說的，剛進門還用不到。' }
        ] },
      { speaker:'店員', emoji:'💁‍♀️', jp:'こちらのシャツ、今セール中なんですよ。', kana:'こちらのしゃつ、いませーるちゅうなんですよ', romaji:'kochira no shatsu, ima sēru-chū nan desu yo', zh:'這件襯衫現在正在特價喔。',
        choices:[
          { jp:'試着してもいいですか？', kana:'しちゃくしてもいいですか', zh:'可以試穿嗎？', correct:true, feedback:'日本尺寸偏小，買前先試穿最安心。' },
          { jp:'ほかの色はありますか？', kana:'ほかのいろはありますか', zh:'有其他顏色嗎？', correct:true, feedback:'「ほかの〜」＝其他的～。' },
          { jp:'お大事に', kana:'おだいじに', zh:'請保重', correct:false, feedback:'這是對生病的人說的，用錯場合了。' }
        ] },
      { speaker:'店員', emoji:'💁‍♀️', jp:'試着室はこちらです。靴はお脱ぎください。', kana:'しちゃくしつはこちらです。くつはおぬぎください', romaji:'shichakushitsu wa kochira desu. kutsu wa onugi kudasai', zh:'試衣間在這邊，請脫鞋。',
        choices:[
          { jp:'はい、わかりました', kana:'はい、わかりました', zh:'好，我知道了', correct:true, feedback:'日本試衣間要脫鞋再進去。' },
          { jp:'靴のまま入ってもいいですか？', kana:'くつのままはいってもいいですか', zh:'可以穿著鞋進去嗎？', correct:false, feedback:'店員剛說要脫鞋，穿鞋進試衣間很失禮。' },
          { jp:'いってきます', kana:'いってきます', zh:'我出門了', correct:false, feedback:'這是出門時對家人說的，不是回應店員。' }
        ] }
    ]},
    { title:'換尺寸與結帳', steps:[
      { speaker:'店員', emoji:'💁‍♀️', jp:'サイズはいかがですか？', kana:'さいずはいかがですか', romaji:'saizu wa ikaga desu ka', zh:'尺寸還合適嗎？',
        choices:[
          { jp:'ちょっと小さいです', kana:'ちょっとちいさいです', zh:'有點小', correct:true, feedback:'「ちょっと」＝有點，說明不合身。' },
          { jp:'ちょうどいいです', kana:'ちょうどいいです', zh:'剛剛好', correct:true, feedback:'「ちょうどいい」＝剛剛好。' },
          { jp:'おいしいです', kana:'おいしいです', zh:'很好吃', correct:false, feedback:'「おいしい」是形容食物的，衣服不能用。' }
        ] },
      { speaker:'店員', emoji:'💁‍♀️', jp:'では、ワンサイズ大きいものをお持ちしますね。', kana:'では、わんさいずおおきいものをおもちしますね', romaji:'dewa, wan saizu ōkii mono o omochi shimasu ne', zh:'那我幫您拿大一號的來。',
        choices:[
          { jp:'お願いします', kana:'おねがいします', zh:'麻煩你了', correct:true, feedback:'接受店員的幫忙就說「お願いします」。' },
          { jp:'ありがとうございます', kana:'ありがとうございます', zh:'謝謝', correct:true, feedback:'道謝也很自然。' },
          { jp:'おかえりなさい', kana:'おかえりなさい', zh:'歡迎回家', correct:false, feedback:'這是迎接家人回家的話，用錯場合。' }
        ] },
      { speaker:'店員', emoji:'💁‍♀️', jp:'よくお似合いですよ。', kana:'よくおにあいですよ', romaji:'yoku oniai desu yo', zh:'很適合您喔。',
        choices:[
          { jp:'ありがとうございます。これにします', kana:'ありがとうございます。これにします', zh:'謝謝，我就買這件', correct:true, feedback:'被稱讚先道謝，再說「これにします」決定購買。' },
          { jp:'うーん、ちょっと考えます', kana:'うーん、ちょっとかんがえます', zh:'嗯…我再考慮一下', correct:true, feedback:'委婉表示先不買，日本店員不會強迫推銷。' },
          { jp:'どういたしまして', kana:'どういたしまして', zh:'不客氣', correct:false, feedback:'被稱讚時應該說謝謝，「どういたしまして」是回應別人道謝的。' }
        ] },
      { speaker:'店員', emoji:'💁‍♀️', jp:'お会計は6,600円です。免税のお手続きをされますか？', kana:'おかいけいはろくせんろっぴゃくえんです。めんぜいのおてつづきをされますか', romaji:'okaikei wa rokusen roppyaku en desu. menzei no otetsuzuki o saremasu ka', zh:'總共 6,600 圓。要辦理免稅手續嗎？',
        choices:[
          { jp:'はい、パスポートです', kana:'はい、ぱすぽーとです', zh:'好，這是護照', correct:true, feedback:'辦免稅要出示護照。' },
          { jp:'いいえ、大丈夫です', kana:'いいえ、だいじょうぶです', zh:'不用了', correct:true, feedback:'不辦免稅也可以，衣服就能馬上穿。' },
          { jp:'食券はどこで買いますか？', kana:'しょっけんはどこでかいますか', zh:'餐券在哪裡買？', correct:false, feedback:'餐券是拉麵店用的，服飾店直接在收銀台結帳。' }
        ] }
    ]}
  ]
}
);
