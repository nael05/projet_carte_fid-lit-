import { Template } from '@walletpass/pass-js';

async function test() {
  try {
    const template = new Template("storeCard", {
      passTypeIdentifier: "pass.test",
      teamIdentifier: "TEST",
      organizationName: "Organization"
    });
    
    const pass = template.createPass({
      serialNumber: "123123123",
      description: "Test Pass"
    });

    pass.primaryFields.add({
      key: "balance",
      label: "Points",
      value: "5"
    });
    
    pass.barcodes = [
      {
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        message: '123456789',
      }
    ];

    console.log("Template configuration success");
  } catch(e) {
    console.error(e);
  }
}

test();
