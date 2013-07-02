var https = require('https');
var querystring = require('querystring');

var Yconnect = exports = module.exports = function (options) {
  this.init(options);
};

Yconnect.prototype.init = function (options) {
  this.options = {
    appId            : options.appId,
    secret           : options.secret,
    redirectUri      : options.redirectUri,
    state            : options.state,
    nonce            : options.nonce,
    prompt           : '',
    scope            : 'openid profile email address',
    authorizationCode: '',
  };
  
  options = options || {};
  
  for (var field in options) {
    this.options[field] = options[field];
  }
  
  this.options.authorizationCode = 
    (new Buffer(options.appId + ':' + options.secret)).toString('base64');
};

Yconnect.prototype.getAuthorizationUri = function () {
  var self = this
    , uri = 'https://auth.login.yahoo.co.jp/yconnect/v1/authorization?'
    , query = {
      response_type: 'code id_token',
      client_id    : self.options.appId,
      redirect_uri : self.options.redirectUri,
      state        : self.options.state,
      prompt       : self.options.prompt,
      nonce        : self.options.nonce,
      scope        : self.scope
    };
  
  return uri + querystring.stringify(query);
};

Yconnect.prototype.getAccessToken = function (code, callback) {
  var self = this
    , postData = querystring.stringify({
      grant_type  : 'authorization_code',
      code        : code,
      redirect_uri: self.options.redirectUri
    })
    , options = {
      hostname: 'auth.login.yahoo.co.jp',
      port    : 443,
      path    : '/yconnect/v1/token',
      method  : 'POST',
      headers : {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": postData.length,
        "Authorization": "Basic " + self.options.authorizationCode
      }
    }
    , req = https.request(options, function (res) {
      var responseBody = '';
      
      res.setEncoding('utf8');
      
      res.on('data', function (chunk) {
        responseBody += chunk;
      });
      
      res.on('end', function () {
        callback(JSON.parse(responseBody));
      });
    });
  
  req.on('error', function (e) {
    callback({error:'problem with request: ' + e.message});
  });
  
  req.write(postData);
  req.end();
};

/**
 * 1. Authorizationエンドポイント
 *
 *   request:
 *     [GET] https://auth.login.yahoo.co.jp/yconnect/v1/authorization
 *     response_type=code+id_token
 *     client_id={appId}
 *     redirect_uri={redirectUri}
 *     state={state}
 *     prompt=''
 *     scope=openid+profile+email+address
 *     nonce={nonce}
 *
 *   response:
 *     {redirectUri}?code={code}&state={state}
 *     {redirectUri}?error={error}&error_description={errorDescription}state={state}
 *       以下のエラーコードを返却します。
 *       var ErrorCode = {
 *         "invalid_request": '必須パラメーターが空、パラメーターが不正、未サポートのパラメーター',
 *         "invalid_scope": 'サポート外のスコープ',
 *         "login_required": 'prompt=none指定されたがログイン画面表示が必須',
 *         "consent_required": 'prompt=none指定されたが同意画面表示が必須',
 *         "unsupported_response_type": 'サポート外のレスポンスタイプを指定',
 *         "unauthorized_client": 'ユーザー認証の必要ないクライアント、クライアント認証が必須なクライアントがresponse_type=tokenを指定した場合',
 *         "access_denied": 'https以外でアクセス',
 *         "server_error": '認可サーバーの予期せぬエラー'
 *       };
 *
 *   var ResponseType = {
 *     DEFAULT: "code",
 *     CODE_ID_TOKEN: "code id_token"
 *   };
 *   // ユーザーに表示するテンプレートの種類
 *   var DisplayType = {
 *     DEFAULT: "page",      // （デフォルト） パソコン版のテンプレート
 *     SMART_PHONE: "touch", // スマートフォン版のテンプレート
 *     FEATURE_PHONE: "wap"  // フィーチャーフォン版のテンプレート
 *   };
 *
 *   // クライアントが強制させたいアクション
 *   // 複数選択する場合はスペース区切りで指定します。
 *   var PromptType = {
 *     DEFAULT: "",
 *     NONE: "none",       // 非表示（必須の場合はエラーが返却されます）
 *     LOGIN: "login",     // ユーザーの再認証
 *     CONSENT: "consent"  // ユーザーの再認可
 *   };
 *
 *   // UserInfo APIから取得できる属性情報を指定できます。
 *   // 複数選択する場合はスペース区切りで指定します。
 *   var ScopeType = {
 *     OPENID: "openid",   // ユーザー識別子を返却します。
 *     PROFILE: "profile", // 姓名・生年・性別を返却します。
 *     EMAIL: "email",     // メールアドレスと確認済みフラグを返却します。
 *     ADDRESS: "address"  // ユーザー登録住所情報を返却します。
 *   };
 *
 * 2. Tokenエンドポイント
 *
 *   request:
 *     [POST] https://auth.login.yahoo.co.jp/yconnect/v1/token
 *     [Header]
 *       Authorization: Basic (new Buff(applicationId + ':' + secret)).toString('base64')
 *
 *     # アクセストークン新規取得時のリクエストパラメーター
 *     grant_type=authorization_code
 *     code={code}
 *     redirect_uri={redirectUri}
 *
 *     response:
 *       {
 *         access_token: {access_token},    // アクセストークン。APIへアクセスするのに使用します。
 *         token_type: {token_type},        // アクセストークンタイプ。ウェブAPIへアクセスする際にアクセストークンを適切に用いるために必要な情報を提供します。
 *         expires_in: {expires_in},        // アクセストークンの有効期限を表す秒数。通常は3600(1時間)です。
 *         refresh_token: {refresh_token},  // リフレッシュトークン。アクセストークンを更新するときに使用します。有効期限は4週間です。
 *         id_token: {id_token}             // ユーザー認証情報を含む改ざん検知用の署名付きトークン。authorizationのresponse_typeにて id_token を指定していた場合のみ返却します。
 *       }
 *
 *     # アクセストークン更新時のリクエストパラメーター
 *     grant_type=refresh_token
 *     refresh_token={refresh_token}
 *
 *     response:
 *       {
 *         access_token: {access_token},    // アクセストークン。APIへアクセスするのに使用します。
 *         token_type: {token_type},        // アクセストークンタイプ。ウェブAPIへアクセスする際にアクセストークンを適切に用いるために必要な情報を提供します。
 *         expires_in: {expires_in},        // アクセストークンの有効期限を表す秒数。通常は3600(1時間)です。
 *       }
 *
 *     error response:
 *       {redirectUri}?error={error}&error_description={errorDescription}state={state}
 *       以下のエラーコードを返却します。
 *       var ErrorCode = {
 *         "invalid_request": '必須パラメーターが空、パラメーターが不正、未サポートのパラメーター',
 *         "invalid_redirect_uri": 'redirect_uriがauthorizationリクエスト時と異なっている。',
 *         "invalid_client": 'Basic認証を行っていない、Basic認証に失敗時',
 *         "unsupported_grant_type": 'サポート外のgrant_type',
 *         "invalid_grant": 'リフレッシュトークンが期限切れ',
 *         "unauthorized_client": 'クライアントが削除されている。',
 *         "access_denied": 'https以外でアクセス、アクティブユーザーでない。',
 *         "server_error": '認可サーバーの予期せぬエラー'
 *       };
 */
