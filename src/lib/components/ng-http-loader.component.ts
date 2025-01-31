/*
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Component, Input, OnInit } from '@angular/core';
import { merge, Observable, partition, timer } from 'rxjs';
import { debounce, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { PendingRequestsInterceptor } from '../services/pending-requests-interceptor.service';
import { SpinnerVisibilityService } from '../services/spinner-visibility.service';
import { Spinkit } from '../spinkits';

@Component({
    selector: 'ng-http-loader',
    templateUrl: './ng-http-loader.component.html',
    styleUrls: ['./ng-http-loader.component.scss']
})
export class NgHttpLoaderComponent implements OnInit {

    spinkit = Spinkit;
    isVisible$!: Observable<boolean>;
    visibleUntil = Date.now();
    showBlockUi: boolean = false;

    @Input() backdrop = true;
    @Input() backgroundColor!: string;
    @Input() debounceDelay = 0;
    @Input() blockUIDelay = 250;
    @Input() entryComponent: any = null;
    @Input() extraDuration = 0;
    @Input() filteredHeaders: string[] = [];
    @Input() filteredMethods: string[] = [];
    @Input() filteredUrlPatterns: string[] = [];
    @Input() minDuration = 0;
    @Input() opacity = '.7';
    @Input() backdropBackgroundColor = '#f1f1f1';
    @Input() spinner: string | null = Spinkit.skWave;

    constructor(private pendingRequestsInterceptor: PendingRequestsInterceptor, private spinnerVisibility: SpinnerVisibilityService) {
    }

    ngOnInit(): void {
        this.initIsvisibleObservable();
        this.nullifySpinnerIfEntryComponentIsDefined();
        this.initFilters();
    }

    private initIsvisibleObservable(): void {
        const [showSpinner$, hideSpinner$] = partition(this.pendingRequestsInterceptor.pendingRequestsStatus$, h => h);

        if (this.blockUIDelay !== 0) {
            this.showBlockUi = true
        }

        this.isVisible$ = merge(
            this.pendingRequestsInterceptor.pendingRequestsStatus$.pipe(switchMap(() => showSpinner$.pipe(debounce(() => timer(this.blockUIDelay))))),
            this.pendingRequestsInterceptor.pendingRequestsStatus$.pipe(switchMap(() => showSpinner$.pipe(debounce(() => timer(this.debounceDelay))))),
            showSpinner$.pipe(switchMap(() => hideSpinner$.pipe(debounce(() => this.getVisibilityTimer$())))),
            this.spinnerVisibility.visibility$
        ).pipe(
            distinctUntilChanged(),
            tap(h => this.updateExpirationDelay(h))
        );
    }

    private nullifySpinnerIfEntryComponentIsDefined(): void {
        if (this.entryComponent) {
            this.spinner = null;
        }
    }

    private initFilters(): void {
        this.initFilteredUrlPatterns();
        this.initFilteredMethods();
        this.initFilteredHeaders();
    }

    private initFilteredUrlPatterns(): void {
        if (!!this.filteredUrlPatterns.length) {
            this.filteredUrlPatterns.forEach(e =>
                this.pendingRequestsInterceptor.filteredUrlPatterns.push(new RegExp(e))
            );
        }
    }

    private initFilteredMethods(): void {
        this.pendingRequestsInterceptor.filteredMethods = this.filteredMethods;
    }

    private initFilteredHeaders(): void {
        this.pendingRequestsInterceptor.filteredHeaders = this.filteredHeaders;
    }

    private updateExpirationDelay(showSpinner: boolean): void {
        if (showSpinner) {
            this.visibleUntil = Date.now() + this.minDuration;
        }
    }

    private getVisibilityTimer$(): Observable<number> {
        return timer(Math.max(this.extraDuration, this.visibleUntil - Date.now()));
    }
}
