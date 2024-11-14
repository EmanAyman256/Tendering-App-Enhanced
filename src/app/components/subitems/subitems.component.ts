import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Formula } from 'src/app/models/formulas.model';
import { MainItem, SubItem } from 'src/app/models/Mainitem.model';
import { ServiceInfo } from 'src/app/models/Services.model';
import { UnitOfMeasure } from 'src/app/models/uom.model';
import { ApiServiceService } from 'src/app/services/api-service.service';
import { RecordsFeaturesService } from 'src/app/services/records-features.service';

@Component({
  selector: 'app-subitems',
  templateUrl: './subitems.component.html',
  styleUrls: ['./subitems.component.css'],
  providers:[MessageService,ConfirmationService]

})
export class SubitemsComponent {
  constructor(private Apiservice:ApiServiceService,private messageService: MessageService, 
    private confirmationService: ConfirmationService,private commonFeatures:RecordsFeaturesService){}
    loading: boolean = true;
   
  expandedRows: { [key: number]: boolean } = {};
  loadingSubItems: boolean = true;
  selectedSubItems: SubItem[] = [];
  recordsServiceNumber!: ServiceInfo[];
  selectedServiceNumberRecordSubItem?: ServiceInfo
  selectedServiceNumberSubItem!: number;
  updateSelectedServiceNumberSubItem!: number;
  updateSelectedServiceNumberRecordSubItem?: ServiceInfo
  shortTextSubItem: string = '';
  recordsFormula!: any[];

  updateShortTextSubItem: string = '';
  shortTextChangeAllowedSubItem: boolean = false;
  updateShortTextChangeAllowedSubItem: boolean = false;
  selectedFormulaSubItem!: string;
  selectedFormulaRecordSubItem: any
  updatedFormulaSubItem!: number;
  updatedFormulaRecordSubItem: any
 
  recordsUnitOfMeasure: UnitOfMeasure[] = [];
  selectedUnitOfMeasure!: string;
  resultAfterTest?: number
  resultAfterTestUpdate?: number
// uom for subitem:
showPopup: boolean = false;
  parameterValues: { [key: string]: number } = {};
  showPopupUpdate: boolean = false;
  parameterValuesUpdate: { [key: string]: number } = {};
  selectedUnitOfMeasureSubItem!: string;
 
  recordsCurrency!: any[];
  selectedCurrency: string = "";
  // currency for subitem:
  selectedCurrencySubItem!: string;
  totalValue: number = 0.0
  subItemsRecords: SubItem[] = [];

  mainItemsRecords: MainItem[] = [];
  clonedSubItem: { [s: number]: SubItem } = {};
  ngOnInit() {
    this.Apiservice.getServices<ServiceInfo[]>().subscribe(response => {
      this.recordsServiceNumber = response
    });
    this.Apiservice.getFormula<any[]>().subscribe(response => {
      this.recordsFormula = response;
    });
    this.Apiservice.getCurrency<any[]>().subscribe(response => {
      this.recordsCurrency = response;
    });
    this.Apiservice.getMainItems<MainItem[]>().subscribe(response => {
      this.mainItemsRecords = response.sort((a, b) => a.invoiceMainItemCode - b.invoiceMainItemCode);
      //response.sort((a, b) => b.invoiceMainItemCode - a.invoiceMainItemCode);
      console.log(this.mainItemsRecords);
      this.loading = false;
  
      this.totalValue = this.mainItemsRecords.reduce((sum, record) => sum + record.totalWithProfit, 0);
      console.log('Total Value:', this.totalValue);
    });
    this.Apiservice.getSubItems<SubItem[]>().subscribe(response => {
      this.subItemsRecords = response;
      this.loadingSubItems=false;
    });
  }
// For Add new  Sub Item
newSubItem: SubItem = {
  Type: '',
  invoiceSubItemCode: 0,
  serviceNumberCode: 0,
  description: "",
  quantity: 0,
  unitOfMeasurementCode: "",
  formulaCode: "",
  amountPerUnit: 0,
  currencyCode: "",
  total: 0
};
addSubItem(mainItem: MainItem) {
  console.log(mainItem);
  if (!this.selectedServiceNumberRecordSubItem && !this.selectedFormulaRecordSubItem) { // if user didn't select serviceNumber && didn't select formula

    const newRecord = {
      unitOfMeasurementCode: this.selectedUnitOfMeasureSubItem,
      currencyCode: this.selectedCurrencySubItem,
      description: this.newSubItem.description,
      quantity: this.newSubItem.quantity,
      amountPerUnit: this.newSubItem.amountPerUnit,
    }
    if (this.newSubItem.amountPerUnit === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'AmountPerUnit is required',
        life: 3000
      });
    }
    else {
      console.log(newRecord)
      const filteredSubItem = Object.fromEntries(
        Object.entries(newRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredSubItem);
      const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

      const updatedRecord: MainItem = {
        ...mainItemWithoutMainItemCode, // Copy all properties from the original record
        subItems: [
          ...(mainItem?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          filteredSubItem
        ],

        invoiceMainItemCode: 0,
        totalWithProfit: 0,
        amountPerUnitWithProfit: 0,
        total: 0,
      }
      console.log(updatedRecord.subItems);

      console.log(updatedRecord);
      // Remove properties with empty or default values
      const filteredRecord = Object.fromEntries(
        Object.entries(updatedRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredRecord);

      this.Apiservice.patchMainItem<MainItem>( mainItem.invoiceMainItemCode, filteredRecord).subscribe({
        next: (res) => {
          console.log('mainitem updated && subItem created:', res);
          this.totalValue = 0;
          this.ngOnInit()
        }, error: (err) => {
          console.log(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
        },
        complete: () => {
          this.resetNewSubItem();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record added successfully ' });
          // this.ngOnInit()
        }
      });

    }
  }
  else if (!this.selectedServiceNumberRecordSubItem && this.selectedFormulaRecordSubItem && this.resultAfterTest) { // if user didn't select serviceNumber && select formula
    const newRecord = {
      unitOfMeasurementCode: this.selectedUnitOfMeasureSubItem,
      currencyCode: this.selectedCurrencySubItem,
      formulaCode: this.selectedFormulaSubItem,
      description: this.newSubItem.description,
      quantity: this.resultAfterTest,
      amountPerUnit: this.newSubItem.amountPerUnit,
    }
    if (this.newSubItem.amountPerUnit === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'AmountPerUnit is required',
        life: 3000
      });
    }
    else {
      console.log(newRecord);

      const filteredSubItem = Object.fromEntries(
        Object.entries(newRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredSubItem);
      const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;
      const updatedRecord: MainItem = {
        ...mainItemWithoutMainItemCode, // Copy all properties from the original record
        subItems: [
          ...(mainItem?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          filteredSubItem
        ],

        invoiceMainItemCode: 0,
        totalWithProfit: 0,
        amountPerUnitWithProfit: 0,
        total: 0,
      }
      console.log(updatedRecord.subItems);
      // Remove properties with empty or default values
      const filteredRecord = Object.fromEntries(
        Object.entries(updatedRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredRecord);
      this.Apiservice. patchMainItem<MainItem>(mainItem.invoiceMainItemCode, filteredRecord).subscribe({
        next: (res) => {
          console.log('mainitem updated && subItem created:', res);
          this.totalValue = 0;
          this.ngOnInit()
        }, error: (err) => {
          console.log(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
        },
        complete: () => {
          this.resetNewSubItem();
          this.selectedFormulaRecordSubItem = undefined
          this.resultAfterTest=undefined;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record added successfully ' });
          // this.ngOnInit()
        }
      });
    }
  }
  else if (this.selectedServiceNumberRecordSubItem && !this.selectedFormulaRecordSubItem && !this.resultAfterTest) { // if user select serviceNumber && didn't select formula

    const newRecord = {
      serviceNumberCode: this.selectedServiceNumberSubItem,
      unitOfMeasurementCode: this.selectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
      currencyCode: this.selectedCurrencySubItem,
      description: this.selectedServiceNumberRecordSubItem.description,
      quantity: this.newSubItem.quantity,
      amountPerUnit: this.newSubItem.amountPerUnit,
    }

    if (this.newSubItem.amountPerUnit === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'AmountPerUnit is required',
        life: 3000
      });
    }
    else {
      console.log(newRecord);

      const filteredSubItem = Object.fromEntries(
        Object.entries(newRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredSubItem);

      // const { mainItemCode, ...mainItemWithoutMainItemCode } = mainItem;
      const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;
      const updatedRecord: MainItem = {
        ...mainItemWithoutMainItemCode, // Copy all properties from the original record
        subItems: [
          ...(mainItem?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          filteredSubItem
        ],

        invoiceMainItemCode: 0,
        totalWithProfit: 0,
        amountPerUnitWithProfit: 0,
        total: 0,

      }

      console.log(updatedRecord);
      console.log(updatedRecord.subItems);

      // Remove properties with empty or default values
      const filteredRecord = Object.fromEntries(
        Object.entries(updatedRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredRecord);

      this.Apiservice.patchMainItem<MainItem>( mainItem.invoiceMainItemCode, filteredRecord).subscribe({
        next: (res) => {
          console.log('mainitem updated && subItem created:', res);
          this.totalValue = 0;
          this.ngOnInit()
        }, error: (err) => {
          console.log(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
        },
        complete: () => {
          this.resetNewSubItem();
          this.selectedFormulaRecordSubItem = undefined;
          this.selectedServiceNumberRecordSubItem = undefined
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record added successfully ' });
          // this.ngOnInit()
        }
      });

    }
  }
  else if (this.selectedServiceNumberRecordSubItem && this.selectedFormulaRecordSubItem && this.resultAfterTest) { // if user select serviceNumber && select formula
    const newRecord = {
      serviceNumberCode: this.selectedServiceNumberSubItem,
      unitOfMeasurementCode: this.selectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
      currencyCode: this.selectedCurrencySubItem,
      formulaCode: this.selectedFormulaSubItem,
      description: this.selectedServiceNumberRecordSubItem.description,
      quantity: this.resultAfterTest,
      amountPerUnit: this.newSubItem.amountPerUnit,
    }
    if (this.newSubItem.amountPerUnit === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'AmountPerUnit is required',
        life: 3000
      });
    }
    else {
      console.log(newRecord);
      const filteredSubItem = Object.fromEntries(
        Object.entries(newRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredSubItem);

      //const { mainItemCode, ...mainItemWithoutMainItemCode } = mainItem;
      const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;
      const updatedRecord: MainItem = {
        ...mainItemWithoutMainItemCode, // Copy all properties from the original record
        subItems: [
          ...(mainItem?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          filteredSubItem
        ],

        invoiceMainItemCode: 0,
        totalWithProfit: 0,
        amountPerUnitWithProfit: 0,
        total: 0,
      }
      console.log(updatedRecord.subItems);
      console.log(updatedRecord);
      // Remove properties with empty or default values
      const filteredRecord = Object.fromEntries(
        Object.entries(updatedRecord).filter(([_, value]) => {
          return value !== '' && value !== 0 && value !== undefined && value !== null;
        })
      );
      console.log(filteredRecord);
      this.Apiservice.patchMainItem<MainItem>( mainItem.invoiceMainItemCode, filteredRecord).subscribe({
        next: (res) => {
          console.log('mainitem updated && subItem created:', res);
          this.totalValue = 0;
          this.ngOnInit()
        }, error: (err) => {
          console.log(err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
        },
        complete: () => {
          this.resetNewSubItem();
          this.selectedFormulaRecordSubItem = undefined
          this.resultAfterTest=undefined;
          this.selectedServiceNumberRecordSubItem = undefined
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record added successfully ' });
          // this.ngOnInit()
        }
      });
    }
  }
}
resetNewSubItem() {
  this.newSubItem = {
    Type: '',
    invoiceSubItemCode: 0,
    // invoiceMainItemCode: 0,
    serviceNumberCode: 0,
    description: "",
    quantity: 0,
    unitOfMeasurementCode: "",
    formulaCode: "",
    amountPerUnit: 0,
    currencyCode: "",
    total: 0
  },
    this.selectedUnitOfMeasureSubItem = "";
  this.selectedFormulaSubItem = "";
  this.selectedCurrencySubItem = "";
}
onSubItemSelection(event: any, subItem: SubItem) {
  console.log(subItem);
  this.selectedSubItems.push(subItem);
}
//In Creation SubItem to handle shortTextChangeAlowlled Flag 
onServiceNumberChangeSubItem(event: any) {
  const selectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === this.selectedServiceNumberSubItem);
  if (selectedRecord) {
    this.selectedServiceNumberRecordSubItem = selectedRecord
    this.shortTextChangeAllowedSubItem = this.selectedServiceNumberRecordSubItem?.shortTextChangeAllowed || false;
    this.shortTextSubItem = ""
  }
  else {
    console.log("no service number");
    //this.dontSelectServiceNumber = false
    this.selectedServiceNumberRecordSubItem = undefined;
  }
}
//In Update SubItem to handle shortTextChangeAlowlled Flag 
onServiceNumberUpdateChangeSubItem(event: any) {
  const updateSelectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === event.value);
  if (updateSelectedRecord) {
    this.updateSelectedServiceNumberRecordSubItem = updateSelectedRecord
    this.updateShortTextChangeAllowedSubItem = this.updateSelectedServiceNumberRecordSubItem?.shortTextChangeAllowed || false;
    this.updateShortTextSubItem = ""
  }
  else {
    this.updateSelectedServiceNumberRecordSubItem = undefined;
  }
}
onFormulaSelectSubItem(event: any) {
  const selectedRecord = this.recordsFormula.find(record => record.formula === this.selectedFormulaSubItem);
  if (selectedRecord) {
    this.selectedFormulaRecordSubItem = selectedRecord
    console.log(this.selectedFormulaRecordSubItem);

  }
  else {
    console.log("no Formula");
    this.selectedFormulaRecordSubItem = undefined;
  }
}
onFormulaUpdateSelectSubItem(event: any) {
  const selectedRecord = this.recordsFormula.find(record => record.formula === event.value);
  if (selectedRecord) {
    this.updatedFormulaRecordSubItem = selectedRecord
    console.log(this.updatedFormulaRecordSubItem);

  }
  else {
    this.updatedFormulaRecordSubItem = undefined;
    console.log(this.updatedFormulaRecordSubItem);
  }
}
onSubItemEditInit(record: SubItem) {
  if (record.invoiceSubItemCode) {
    this.clonedSubItem[record.invoiceSubItemCode] = { ...record };
  }
}
//Depends on MainItems
onSubItemEditSave(index: number, record: SubItem, mainItem: MainItem) {
  console.log(mainItem);
  console.log(record);
  console.log(index);

  const { invoiceSubItemCode, ...subItemWithoutSubItemCode } = record;
  console.log(this.updateSelectedServiceNumberSubItem);

  if (this.updateSelectedServiceNumberRecordSubItem) {

    const newRecord: SubItem = {
      ...record, // Copy all properties from the original record
      // Modify specific attributes
      unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
      description: this.updateSelectedServiceNumberRecordSubItem.description,
    };
    console.log(newRecord);

    const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

    const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
      // Modify only the specific sub-item that needs to be updated
      subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
        ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
    );

    const updatedRecord: MainItem = {
      ...mainItemWithoutMainItemCode, // Copy all properties from the original record
      subItems: updatedSubItems,
      invoiceMainItemCode: 0,
      totalWithProfit: 0,
      total: 0,
      amountPerUnitWithProfit: 0,
    }
    console.log(updatedRecord);
    // Remove properties with empty or default values
    const filteredRecord = Object.fromEntries(
      Object.entries(updatedRecord).filter(([_, value]) => {
        return value !== '' && value !== 0 && value !== undefined && value !== null;
      })
    );
    console.log(filteredRecord);

    this.Apiservice.patchMainItem<MainItem>( mainItem.invoiceMainItemCode, filteredRecord).subscribe({
      next: (res) => {
        console.log('mainitem with && subItem updated:', res);
        this.totalValue = 0;
        this.ngOnInit()
      }, error: (err) => {
        console.log(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
      },
      complete: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record updated successfully ' });
        // this.ngOnInit()
      }
    });

  }
  if (this.updateSelectedServiceNumberRecordSubItem && this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
    console.log(record);
    console.log(this.updateSelectedServiceNumberRecordSubItem);
    const newRecord: SubItem = {
      ...record,
      unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
      description: this.updateSelectedServiceNumberRecordSubItem.description,
      quantity: this.resultAfterTestUpdate,
    };
    console.log(newRecord);

    const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

    const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
      // Modify only the specific sub-item that needs to be updated
      subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
        ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
    );

    const updatedRecord: MainItem = {
      ...mainItemWithoutMainItemCode, // Copy all properties from the original record
      subItems: updatedSubItems,
      invoiceMainItemCode: 0,
      totalWithProfit: 0,
      total: 0,
      amountPerUnitWithProfit: 0,
    }
    console.log(updatedRecord);
    // Remove properties with empty or default values
    const filteredRecord = Object.fromEntries(
      Object.entries(updatedRecord).filter(([_, value]) => {
        return value !== '' && value !== 0 && value !== undefined && value !== null;
      })
    );
    console.log(filteredRecord);

    this.Apiservice.patchMainItem<MainItem>(mainItem.invoiceMainItemCode, filteredRecord).subscribe({
      next: (res) => {
        console.log('mainitem with && subItem updated:', res);
        this.totalValue = 0;
        this.ngOnInit()
      }, error: (err) => {
        console.log(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
      },
      complete: () => {
        this.updatedFormulaRecordSubItem=undefined;
        this.resultAfterTestUpdate=undefined
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record updated successfully ' });
        // this.ngOnInit()
      }
    });
  }
  if (this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
    const newRecord: SubItem = {
      ...record,
      quantity: this.resultAfterTestUpdate,
    };
    console.log(newRecord);

    const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

    const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
      // Modify only the specific sub-item that needs to be updated
      subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
        ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
    );

    const updatedRecord: MainItem = {
      ...mainItemWithoutMainItemCode, // Copy all properties from the original record
      subItems: updatedSubItems,
      invoiceMainItemCode: 0,
      totalWithProfit: 0,
      total: 0,
      amountPerUnitWithProfit: 0,
    }
    console.log(updatedRecord);
    // Remove properties with empty or default values
    const filteredRecord = Object.fromEntries(
      Object.entries(updatedRecord).filter(([_, value]) => {
        return value !== '' && value !== 0 && value !== undefined && value !== null;
      })
    );
    console.log(filteredRecord);

    this.Apiservice.patchMainItem<MainItem>(mainItem.invoiceMainItemCode, filteredRecord).subscribe({
      next: (res) => {
        console.log('mainitem with && subItem updated:', res);
        this.totalValue = 0;
        this.ngOnInit()
      }, error: (err) => {
        console.log(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
      },
      complete: () => {
        this.updatedFormulaRecordSubItem=undefined;
        this.resultAfterTestUpdate=undefined
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record updated successfully ' });
        // this.ngOnInit()
      }
    });
  }
  if (!this.updateSelectedServiceNumberRecordSubItem && !this.updatedFormulaRecordSubItem && !this.resultAfterTestUpdate) {

    const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

    const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
      // Modify only the specific sub-item that needs to be updated
      subItem.invoiceSubItemCode === invoiceSubItemCode
        ? this.removeProperties({ ...subItem, ...subItemWithoutSubItemCode }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
    );

    const updatedRecord: MainItem = {
      ...mainItemWithoutMainItemCode, // Copy all properties from the original record
      subItems: updatedSubItems,
      invoiceMainItemCode: 0,
      totalWithProfit: 0,
      total: 0,
      amountPerUnitWithProfit: 0,
    }
    console.log(updatedRecord);
    // Remove properties with empty or default values
    const filteredRecord = Object.fromEntries(
      Object.entries(updatedRecord).filter(([_, value]) => {
        return value !== '' && value !== 0 && value !== undefined && value !== null;
      })
    );
    console.log(filteredRecord);

    this.Apiservice.patchMainItem<MainItem>( mainItem.invoiceMainItemCode, filteredRecord).subscribe({
      next: (res) => {
        console.log('mainitem with && subItem updated:', res);
        this.totalValue = 0;
        this.ngOnInit()
      }, error: (err) => {
        console.log(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
      },
      complete: () => {

        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Record updated successfully ' });
      }
    });

  }
}
onSubItemEditCancel(subItem: any, index: number) {
  // Check if subItem exists in clonedSubItems
  const originalItem = this.clonedSubItem[subItem.invoiceSubItemCode];

  if (originalItem) {
    // Revert the item in the table to its original state
    this.mainItemsRecords.forEach(mainItem => {
      if (mainItem.subItems && mainItem.subItems[index] === subItem) {
        mainItem.subItems[index] = { ...originalItem }; // Restore original item
      }
    });
    // Remove the item from clonedSubItems
    delete this.clonedSubItem[subItem.invoiceSubItemCode];
  }

}
deleteRecord() {
  if (this.selectedSubItems.length) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected record?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        for (const record of this.selectedSubItems) {
          console.log(record);
          if (record.invoiceSubItemCode) {
            this.Apiservice.deleteSubItems<SubItem>( record.invoiceSubItemCode).subscribe(response => {
              console.log('subitem deleted :', response);
              //this.totalValue = 0;
              // this.ngOnInit();
            });
          }

        }
        this.messageService.add({ severity: 'success', summary: 'Successfully', detail: 'Deleted', life: 3000 });
        this.selectedSubItems = []; // Clear the selectedRecords array after deleting all records
      }
    });
  }
}

}
