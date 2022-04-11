import { Component, OnInit, Inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import {Account} from "../_models";
// Auth0: Import the AuthService type from the SDK
import { AuthService } from '@auth0/auth0-angular';
import { CookieService } from 'ngx-cookie-service';

@Component({ templateUrl: 'login.component.html' })
export class LoginComponent implements OnInit {
    form: FormGroup;
    loading = false;
    submitted = false;
    userNotActivated = false;
    account = this.accountService.accountValue;
    //auto login related
    tokenFromSocialLogin = null;
    tokenFromCookie = null;
    idpFromCookie = null;


    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService,
        private cookieService: CookieService,
        public auth: AuthService
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });

        const parsedHash = new URLSearchParams(
          //這個是從網址列的hashtag#後面取出參數的方法，因為目前使用的方法，auth0會把回傳的access token放在這網址列的#後方
          window.location.hash.substr(1) // skip the first char (#)
        );

        //被login結束之後redirect回來->抓token，然後拿user profile，導到dashboard
        //因為網址有token代表剛登入完，就算cookie裡面有，也應該拿新的來用，所以要優先用這個，這個沒有才去找cookie
        this.tokenFromSocialLogin = parsedHash.get("access_token"); //這個是從網址列的hashtag#後面取出參數的方法，因為目前使用的方法，auth0會把回傳的access token放在這網址列的#後方
        this.tokenFromCookie = this.cookieService.get( 'access_token');
        this.idpFromCookie = this.cookieService.get( 'idp');

        console.log('this.tokenFromSocialLogin='+this.tokenFromSocialLogin);
        console.log('this.tokenFromCookie='+this.tokenFromCookie);
        console.log('this.idpFromCookie='+this.idpFromCookie);


        if (this.tokenFromSocialLogin!== null) {
          //這其實是整個連同auth0在內，完整登入的一部分，不算是自動登入，所以要寫入cookie
          console.log('Social login manually...');
          this.accountService.getSocialUserInfoByToken(this.tokenFromSocialLogin)
            .pipe(first())
            .subscribe({
              next: () => {
                const account =  this.accountService.accountValue;
                this.accountService.setJWTTokenToCookie(this.tokenFromSocialLogin, account.email, account.username, "SOCIAL");

                this.accountService.registerSocialAccount(this.tokenFromSocialLogin)
                  .subscribe({
                    next: () => {
                      //一切順利，導向登入後的網址
                      this.loading = false;
                      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                      this.router.navigateByUrl(returnUrl);
                    },
                    error: error => {
                      //註冊此帳號發生錯誤，最大可能是有兩個不同的帳號用了同一個email
                      this.alertService.error(error + 'Social login failed.');
                      this.loading = false;
                      this.accountService.logout('SOCIAL');
                    }
                  });

              },
              error: error => {
                this.alertService.error(error + 'Social login failed.');
                this.loading = false;
                this.accountService.logout('SOCIAL');
              }
            });
        }else if (this.tokenFromCookie!==null && this.idpFromCookie === 'SOCIAL'){
          console.log('Social login automatically...');
          //曾經登入過，直接開啟網頁->到cookie拿token，然後拿user profile，導到dashboard
          //這是自動登入，所以從cookie讀取資料，而不用寫入cookie
          this.accountService.getSocialUserInfoByToken(this.tokenFromCookie)
            .pipe(first())
            .subscribe({
              next: () => {
                const account =  this.accountService.accountValue;
                this.loading = false;
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                this.router.navigateByUrl(returnUrl);
              },
              error: error => {
                // 自動登入的錯誤不用顯示給user看
                // this.alertService.error(error);
                this.loading = false;
              }
            });
        }else if (this.tokenFromCookie!==null && this.idpFromCookie === 'LOCAL'){
          console.log('Local login automatically...');
          //利用getByToken，實際上是做自動登入，還可以順變更新並取回user profile
          this.accountService.getByToken(this.tokenFromCookie)
            .pipe(first())
            .subscribe({
              next: () => {
                this.loading = false;
                // get return url from query parameters or default to home page
                const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                this.router.navigateByUrl(returnUrl);
              },
              error: error => {
                // 自動登入的錯誤不用顯示給user看
                // this.alertService.error(error);
                this.loading = false;
              }
            });
        }else{
          //do nothing,就讓user用手動做local login
          console.log('No auto login available, display login form');
        }
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }



    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        var formData: any = new FormData();
        formData.append('username', this.f.email.value);
        formData.append('password', this.f.password.value);

        this.accountService.login(formData)
            .pipe(first())
            .subscribe({
                next: () => {
                    // get return url from query parameters or default to home page
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/profile';
                    this.router.navigateByUrl(returnUrl);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                    if (error.includes('Forbidden')){
                      // 表示是還沒activate，就導向另外一個resend activate email 的畫面
                      this.userNotActivated = true;
                    } else {
                      this.userNotActivated = false;
                  }
                }
            });
    }

    loginAuth0ImplicitFlow(conn: string){
      let url = 'https://dev-e8k8umnn.us.auth0.com/authorize?response_type=token&client_id=42J1I9xJCMnanunfDLD4ctEIpqQ9dbza&connection='
      + conn + '&redirect_uri=https://usermgt-front.herokuapp.com/account/login&scope=openid%20profile%20email';

      window.open(url,"_self");
    }

    onResendVerificationEmail() {
      this.loading = true;
      var accountToResendEmail: Account = new Account();
      accountToResendEmail.email = this.f.email.value;
      accountToResendEmail.password = this.f.password.value;

      // console.log('accountToResendEmail.email=' + accountToResendEmail.email);
      // console.log('accountToResendEmail.password=' + accountToResendEmail.password);

      this.accountService.resendVerificationEmail(accountToResendEmail)
        .pipe(first())
        .subscribe({
          next: () => {
            // get return url from query parameters or default to home page
            this.loading = false;
            this.userNotActivated = false;
            //resend之後把表格清空
            this.form.reset();
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            this.router.navigateByUrl(returnUrl);
          },
          error: error => {
            this.alertService.error(error);
            this.loading = false;
            if (error.includes('Forbidden')){
              //表示是還沒activate，設定flag之後resend的button就會跑出來
              this.userNotActivated = true;
            }

          }
        });
    }
}
