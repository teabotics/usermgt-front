import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import { Account, Auth0UserInfo } from '@app/_models';
import {AcctStat} from "@app/_models/acctstat";
// Auth0: Import the AuthService type from the SDK
import { AuthService } from '@auth0/auth0-angular';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({ providedIn: 'root' })
export class AccountService {
    private accountSubject: BehaviorSubject<Account>;
    public account: Observable<Account>;

    constructor(
        private router: Router,
        private http: HttpClient,
        private cookieService: CookieService,
        private auth: AuthService
    ) {
        this.accountSubject = new BehaviorSubject<Account>(null);
        this.account = this.accountSubject.asObservable();
    }

    public get accountValue(): Account {
        return this.accountSubject.value;
    }

    login(formData: FormData) {
        return this.http.post<any>(`${baseUrl}/token`, formData, { withCredentials: true })
            .pipe(map(account => {
                this.accountSubject.next(account);
                return account;
            }));
    }

    resendVerificationEmail(accountToResendEmail: Account) {
      return this.http.post<any>(`${baseUrl}/resendemail`, accountToResendEmail)
        .pipe(map(account => {
          return;
        }));
    }

    isAccessTokenExists() {
      return this.cookieService.get( 'access_token');
    }

    getByToken(token: string) {
      const headers = { 'Authorization': 'Bearer '+ token};
      return this.http.post<any>(`${baseUrl}/profile`, {}, { headers })
        .pipe(map(account => {
          this.accountSubject.next(account);
          return account;
        }));

    }


    logout( idp:string = 'NOT_ASSIGN' ) {
        this.cookieService.deleteAll( '/', 'usermgt-front.herokuapp.com',false, 'Lax');

        if (idp === 'NOT_ASSIGN'){
          idp = this.accountValue.idp
        }

        if ( idp==='SOCIAL') {
          //logout social media
          //用的logout http api，會出現無法解決的CORS問題，所以只能用angular SDK來logout
          this.auth.logout({ returnTo: 'https://usermgt-front.herokuapp.com/account/login' });
        }else{
          //TODO: 雖然先自砍client端的cookie，但是保險起見最好還是呼叫一下server端，讓server端也記錄一下？也許再從server端砍一次cookie？
          window.location.reload();
          this.stopRefreshTokenTimer();
          this.accountSubject.next(null);
          this.router.navigate(['/account/login']);
        }

    }

    refreshToken() {
        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map((account) => {
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    register(account: Account) {
        return this.http.post(`${baseUrl}/register`, account);
    }

    verifyEmail(token: string) {
        return this.http.post(`${baseUrl}/verify-email`, { token });
    }

    forgotPassword(email: string) {
        return this.http.post(`${baseUrl}/forgot-password`, { email });
    }

    validateResetToken(token: string) {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token });
    }

    resetPassword(token: string, password: string, confirmPassword: string) {
        return this.http.post(`${baseUrl}/reset-password`, { token, password, confirmPassword });
    }

    getAll() {
        const authStr = 'Bearer '+ this.cookieService.get( 'access_token');
        const headers = { 'Authorization': authStr};

        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type':  'application/json',
            Authorization: authStr
          })
        };
        return this.http.get<Account[]>(baseUrl, httpOptions);
    }

    getAcctStat() {

      const authStr = 'Bearer '+ this.cookieService.get( 'access_token');
      const headers = { 'Authorization': authStr};

      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type':  'application/json',
          Authorization: authStr
        })
      };
      return this.http.get<AcctStat>(`${baseUrl}/acctstat`, httpOptions);

    }

    getById(id: string) {
        return this.http.get<Account>(`${baseUrl}/${id}`);
    }

    getSocialUserInfoByToken(token:string) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type':  'application/json',
          'Authorization': 'Bearer '+ token
        })
      };

      return this.http.get<Auth0UserInfo>(`https://dev-e8k8umnn.us.auth0.com/userinfo`, httpOptions)
        .pipe(map((auth0UserInfo: Auth0UserInfo) => {
         let account = new Account();
          account.email = auth0UserInfo.email;
          account.username = auth0UserInfo.name;
          account.idp = 'SOCIAL';
          account.social_id = auth0UserInfo.sub;
          account = { ...this.accountValue, ...account };
          this.accountSubject.next(account);

          return account;
        }));
    }

    registerSocialAccount (tokenStr: string) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type':  'application/json',
          'Authorization': 'Bearer '+ tokenStr
        })
      };

      return this.http.post<Account>(`${baseUrl}/registersocial`, this.accountValue, httpOptions);
    }

    create(params) {
        return this.http.post(baseUrl, params);
    }

    update(id, params) {

        return this.http.put(`${baseUrl}/${id}`, params)
            .pipe(map((account: any) => {
                // update the current account if it was updated
                if (account.id === this.accountValue.id) {
                    // publish updated account to subscribers
                    account = { ...this.accountValue, ...account };
                    this.accountSubject.next(account);
                }
                return account;
            }));
    }

    updateByAccountObject(accountToUpdate: Account) {
      const token = this.cookieService.get('access_token');
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type':  'application/json',
          'Authorization': 'Bearer '+ token
        })
      };
      return this.http.put(`${baseUrl}/update`, accountToUpdate, httpOptions)
        .pipe(map((account: any) => {
          // update the current account if it was updated
          if (account.id === this.accountValue.id) {
            // publish updated account to subscribers
            account = { ...this.accountValue, ...account };
            this.accountSubject.next(account);
          }
          return account;
        }));
    }


    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(finalize(() => {
                // auto logout if the logged in account was deleted
                if (id === this.accountValue.id)
                    this.logout();
            }));
    }

    // helper methods

    private refreshTokenTimeout;

    private startRefreshTokenTimer() {
        // parse json object from base64 encoded jwt token
        const jwtToken = JSON.parse(atob(this.accountValue.jwtToken.split('.')[1]));

        // set a timeout to refresh the token a minute before it expires
        const expires = new Date(jwtToken.exp * 1000);
        const timeout = expires.getTime() - Date.now() - (60 * 1000);
        this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), timeout);
    }

    public setJWTTokenToCookie(token: string, email:string, username:string, idp: string) {
      // write cookie
      // console.log('About to set cookie....................');
      // console.log('idp='+idp);
      this.cookieService.deleteAll( '/', 'usermgt-front.herokuapp.com', true, 'None');
      this.cookieService.set( 'access_token', token, { expires: 30, path: '/', secure: true, sameSite: 'None' });
      this.cookieService.set( 'idp', idp, { expires: 30, path: '/', secure: true,  sameSite: 'None' });


      if (email === this.accountValue.email) {
        // publish updated account to subscribers
        let account = new Account();
        account.access_token = token;
        account.email = email;
        account.idp = idp;
        account.username = username;
        account = { ...this.accountValue, ...account };
        this.accountSubject.next(account);
      }

    }

    private getJWTTokenToCookie() {
      let token: string = null;
      if (this.accountValue.access_token != null) {
        token = this.cookieService.get( 'access_token');
      }
      return token;
    }


    private stopRefreshTokenTimer() {
        clearTimeout(this.refreshTokenTimeout);
    }
}
