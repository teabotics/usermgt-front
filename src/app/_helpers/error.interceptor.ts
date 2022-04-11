import { Injectable } from '@angular/core';
import {HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            if ([401, 403].includes(err.status) && this.accountService.accountValue) {
                // auto logout if 401 or 403 response returned from api
                // this.accountService.logout();
                // window.location.reload();
            }

            //因為fastapi的http exception裡面的detail屬性，會放在body裡面，用一個只有"detail"這個key的json來存放
            //所以要把這個錯誤訊息抓出來，就要去parse這個json body
            //這個http exception的detail是唯一可以放客製化錯誤訊息的地方
            let errResponseBody = JSON.parse(JSON.stringify(err.error));
            // console.log('errResponseBody.detail='+ errResponseBody.detail);
            let error = (err && err.error && err.error.message) || err.statusText;
            error = error + '. ' + errResponseBody.detail;
            // console.error(err);
            return throwError(error);
        }))
    }
}
