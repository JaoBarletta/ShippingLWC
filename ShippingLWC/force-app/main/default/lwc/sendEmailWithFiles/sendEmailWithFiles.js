import { LightningElement, api, track, wire } from 'lwc';
import getLightningEmailTemplates from '@salesforce/apex/ShippingEmailService.getLightningEmailTemplates';
import getShippingFiles         from '@salesforce/apex/ShippingEmailService.getShippingFiles';
import getShippingAccounts      from '@salesforce/apex/ShippingEmailService.getShippingAccounts';
import getContactsByAccount     from '@salesforce/apex/ShippingEmailService.getContactsByAccount';
import previewTemplate          from '@salesforce/apex/ShippingEmailService.previewTemplate';
import sendEmailWithAttachments from '@salesforce/apex/ShippingEmailService.sendEmailWithAttachments';
import { ShowToastEvent }       from 'lightning/platformShowToastEvent';
import { refreshApex }          from '@salesforce/apex';

export default class ShippingEmail extends LightningElement {
    @api recordId;

    @track templateOptions   = [];
    @track accountOptions    = [];
    @track contactOptions    = [];
    @track fileOptions       = [];

    @track selectedTemplate;
    @track selectedAccountId;
    @track selectedContactId;
    @track selectedFileIds    = [];

    @track subject           = '';
    @track body              = '';
    @track extraEmails       = '';
    @track noFilesMessage    = '';

    wiredFilesResult;

    @wire(getLightningEmailTemplates)
    wiredTemplates({ data, error }) {
        if (data) {
            this.templateOptions = data;
        }
        else if (error) {
            this.showToast('Erro', 'Não foi possível carregar templates: ' + error.body.message, 'error');
        }
    }

    @wire(getShippingFiles, { shippingId: '$recordId' })
    wiredFiles(result) {
        this.wiredFilesResult = result;
        if (result.data) {
            this.fileOptions = result.data;
            this.noFilesMessage = result.data.length
                ? ''
                : 'Nenhum arquivo encontrado para este Shipping.';
        }
        else if (result.error) {
            this.showToast('Erro', result.error.body.message, 'error');
        }
    }

    @wire(getShippingAccounts, { shippingId: '$recordId' })
    wiredAccounts({ data, error }) {
        if (data) {
            this.accountOptions = data;
        }
        else if (error) {
            this.showToast('Erro', 'Não foi possível carregar contas: ' + error.body.message, 'error');
        }
    }

    handleTemplateChange(evt) {
        this.selectedTemplate = evt.detail.value;
        previewTemplate({ templateId: this.selectedTemplate, whatId: this.recordId })
            .then(res => {
                this.subject = res.subject;
                this.body    = res.body;
            })
            .catch(err => {
                this.showToast('Erro', 'Falha ao renderizar template: ' + err.body.message, 'error');
            });
    }

    handleAccountChange(evt) {
        this.selectedAccountId = evt.detail.value;
        getContactsByAccount({ accountId: this.selectedAccountId })
            .then(data => {
                this.contactOptions = data;
            })
            .catch(err => {
                this.showToast('Erro', 'Falha ao carregar contatos: ' + err.body.message, 'error');
            });
    }

    handleContactChange(evt) {
        this.selectedContactId = evt.detail.value;
    }

    handleFilesChange(evt) {
        this.selectedFileIds = evt.detail.value;
    }

    async handleUploadFinished(evt) {
        this.showToast('Sucesso', `${evt.detail.files.length} arquivo(s) anexado(s)`, 'success');
        await refreshApex(this.wiredFilesResult);
    }

    handleSubjectChange(evt) {
        this.subject = evt.target.value;
    }

    handleBodyChange(evt) {
        // corrigido: usa detail.value em rich-text
        this.body = evt.detail.value;
    }

    handleExtraEmailsChange(evt) {
        this.extraEmails = evt.target.value;
    }

    handleSendEmail() {
        const extraTo = this.extraEmails
            ? this.extraEmails.split(';').map(e => e.trim())
            : [];

        sendEmailWithAttachments({
            templateId:        this.selectedTemplate,
            whatId:            this.recordId,
            contactId:         this.selectedContactId,
            contentVersionIds: this.selectedFileIds,
            overrideSubject:   this.subject,
            overrideBody:      this.body,
            extraToAddresses:  extraTo
        })
        .then(() => {
            this.showToast('Sucesso', 'E-mail enviado com sucesso!', 'success');
        })
        .catch(err => {
            this.showToast('Erro', 'Falha ao enviar: ' + err.body.message, 'error');
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
