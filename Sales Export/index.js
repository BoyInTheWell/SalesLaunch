const REDIRECT_URI = 'http://127.0.0.1:5500/';
const CLIENT_ID = 'sYtkyBgQk28y0YWAN4L2YQ6pvBZDBZep';
const CLIENT_SECRET = 'tyevcmzUunMXdDdG45o4mjDimOa5LgPd';
const clientIDandSecret = window.btoa(CLIENT_ID + ':' + CLIENT_SECRET)
const STATE = '*Bpo2024*';
const SCOPE = 'sales';
const url = `https://api.contaazul.com/`
let ACESS_TOKEN = '';
let REFRESH_TOKEN = '';

let MASTER_PRODUCTS = [];

function get_allRaws(raws) {
    const data = [];
    raws.forEach(e => {
        e['Raw'].forEach(q => {
            data.push(q)
        })

    });
    return [...new Map(data.map(item => [item['Name'], item])).values()];
}

function interpret_table(data) {

    var table = data.split("\n");

    for (i in table) {
        table[i] = table[i].split("\t");
    }

    var keys = table.shift();
    var objects = table.map(function (values) {
        return keys.reduce(function (o, k, i) {
            o[k] = values[i];
            return o;
        }, {});
    });

    return objects;
}

async function get_or_post_customers(data, token) {
    const promises_array = []
    const iterable_data = data.filter((obj1, i, arr) =>
        arr.findIndex(obj2 => (obj2.Cliente === obj1.Cliente)) === i
    )

    iterable_data.forEach((e) => {
        const type_of_person = e['Documento'].length > 17 ? "LEGAL" : "NATURAL"

        promises_array.push(new Promise((resolve, reject) => {
            let customer_body = {
                "name": e['Cliente'],
                "person_type": type_of_person,
                "document": e['Documento']
            }

            fetch(url + 'v1/customers', {
                method: "POST",
                body: JSON.stringify(customer_body),
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'

                }
            }).then((res) => {
                if (res.status == 201) {

                    resolve(res.json())
                } else {
                    fetch(url + 'v1/customers?document=' + customer_body['document'], {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'

                        }
                    }).then((res) => res.json())
                        .then((dat) => {
                            resolve(dat[0])
                        })
                }
            })
        }))

    })

    return promises_array
}

async function get_or_post_services(data, token) {
    const promises_array = []
    const iterable_data = data.filter((obj1, i, arr) =>
        arr.findIndex(obj2 => (obj2["Item_Code"] === obj1['Item_Code'])) === i
    )

    iterable_data.forEach((e) => {
        promises_array.push(
            new Promise((resolve, reject) => {
                fetch(url + 'v1/services?code=' + e['Item_Code'], {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'

                    }
                }).then((res) => {
                    if (res.ok) {
                        return (res.json()).then(dat => resolve(dat[0]))
                    } else {
                        const body = {
                            "name": e['Name'],
                            "value": e['Unit_Value'],
                            "type": "PROVIDED",
                            "cost": 0,
                            "code": e['Item_Code']
                        }
                        fetch(url + 'v1/services', {
                            method: 'POST',
                            body: JSON.stringify(body),
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'

                            }
                        }).then((result) => {
                            resolve(result.json())
                        })

                    }
                })
            })
        )
    })

    return promises_array
}

async function get_or_post_products(data, token) {
    const promises_array = []
    const iterable_data = data.filter((obj1, i, arr) =>
        arr.findIndex(obj2 => (obj2["Item_Code"] === obj1['Item_Code'])) === i
    )

    iterable_data.forEach((e) => {
        promises_array.push(
            new Promise((resolve, reject) => {
                fetch(url + 'v1/products?code=' + e['Item_Code'], {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'

                    }
                }).then((res) => {
                    if (res.ok) {
                        return (res.json()).then(dat => resolve(dat[0]))
                    } else {
                        const body = {
                            "name": e['Name'],
                            "value": e['Unit_Value'],
                            "cost": 0,
                            "code": e['Item_Code']
                        }
                        fetch(url + 'v1/products', {
                            method: 'POST',
                            body: JSON.stringify(body),
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'

                            }
                        }).then((result) => {
                            resolve(result.json())
                        })

                    }
                })
            })
        )
    })

    return promises_array
}

async function get_bank(data, token) {
    const promises_array = []
    const iterable_data = data.filter((obj1, i, arr) =>
        arr.findIndex(obj2 => (obj2["Payment_Bank"] === obj1['Payment_Bank'])) === i
    )

    iterable_data.forEach(e => {
        promises_array.push(
            new Promise(resolve => {
                   fetch(url + 'v1/sales/banks?search=' + e['Payment_Bank'], {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json())
                .then(dat => resolve(dat))
            })
         
        )
    })

    return promises_array
}

async function post_sales(data, token) {
    const promises_array = []

    data.forEach((e, i) => {
        promises_array.push(
            new Promise((resolve, reject) => {
                const services = []

                switch (e['Payment_Way']) {
                    case "Cartao de Debito":
                        method = "DEBIT_CARD"
                        break;
                    case "Cartao de Credito":
                        method = "CREDIT_CARD"
                        break;
                    case "Dinheiro":
                        method = "CASH"
                        break;
                    case "Pix":
                        method = "INSTANT_PAYMENT"
                        break;
                    case "Credito da Loja":
                        method = "STORE_CREDIT"
                        break;
                    case "Boleto":
                        method = "BANKING_BILLET"
                        break;
                    default:
                        method = "OTHER"
                        break;
                }
                const sale_value = (Number(e['Valor Total'].replace(',', '.')) + Number(e['Actual_Tax'])) - Number(e['Actual_Discount'])

                e['Raw'].forEach(q => {
                    services.push(
                        {
                            "description": q['Name'],
                            "service_id": q['service_id'],
                            "quantity": q['Quantity'],
                            "value": q['Unit_Value'],
                        }
                    )
                })

                const sales_body = {

                    "emission": e['Data'],
                    "status": "PENDING",
                    "customer_id": e['customer_id'],
                    "services": services,
                    "discount": {
                        "measure_unit": "VALUE",
                        "rate": e['Actual_Discount']
                    },
                    "payment": {
                        "type": "CASH",
                        "method": method,
                        "installments": [
                            {
                                "number": 1,
                                "value": sale_value,
                                "due_date": e['Data'],
                                "status": "PENDING"
                            }
                        ],
                        "financial_account_id": e['financial_account_id']
                    },
                    "notes": e['Observação'],
                    "shipping_cost": e['Actual_Tax']
                }

                fetch(url + 'v1/sales', {
                    "method": "POST",
                    "body": JSON.stringify(sales_body),
                    "headers": {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
            
                }).then(res => {
                    if (res.ok) {
                        resolve(sales_body)
                    } else {
                        reject(sales_body)
                    }
                })

                
                
            })
        )
    })

    return promises_array
}

async function post_products_sales(data, token) {
    const promises_array = []

    data.forEach((e, i) => {
        promises_array.push(
            new Promise((resolve, reject) => {
                const products = []

                switch (e['Payment_Way']) {
                    case "Cartao de Debito":
                        method = "DEBIT_CARD"
                        break;
                    case "Cartao de Credito":
                        method = "CREDIT_CARD"
                        break;
                    case "Dinheiro":
                        method = "CASH"
                        break;
                    case "Pix":
                        method = "INSTANT_PAYMENT"
                        break;
                    case "Credito da Loja":
                        method = "STORE_CREDIT"
                        break;
                    case "Boleto":
                        method = "BANKING_BILLET"
                        break;
                    default:
                        method = "OTHER"
                        break;
                }
                const sale_value = (Number(e['Valor Total'].replace(',', '.')) + Number(e['Actual_Tax'])) - Number(e['Actual_Discount'])

                e['Raw'].forEach(q => {
                    products.push(
                        {
                            "description": q['Name'],
                            "product_id": q['product_id'],
                            "quantity": q['Quantity'],
                            "value": q['Unit_Value'],
                        }
                    )
                })

                const sales_body = {

                    "emission": e['Data'],
                    "status": "PENDING",
                    "customer_id": e['customer_id'],
                    "products": products,
                    "discount": {
                        "measure_unit": "VALUE",
                        "rate": e['Actual_Discount']
                    },
                    "payment": {
                        "type": "CASH",
                        "method": method,
                        "installments": [
                            {
                                "number": 1,
                                "value": sale_value,
                                "due_date": e['Data'],
                                "status": "PENDING"
                            }
                        ],
                        "financial_account_id": e['financial_account_id']
                    },
                    "notes": e['Observação'],
                    "shipping_cost": e['Actual_Tax']
                }

                fetch(url + 'v1/sales', {
                    "method": "POST",
                    "body": JSON.stringify(sales_body),
                    "headers": {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
            
                }).then(res => {
                    if (res.ok) {
                        resolve(sales_body)
                    } else {
                        reject(sales_body)
                    }
                })

                
                
            })
        )
    })

    return promises_array
}

async function send_services_request_sales(data, token) {
    let customer_array = []
    let services_array = []
    let banks_array = []
    let sales_array = []

    const customer_promise = await get_or_post_customers(data, token)

    await Promise.all(customer_promise)
        .then((response) => {
            console.log("Finished getting or posting the customer");
            customer_array = response

            data.forEach(e => {
                const findCurrentName = customer_array.filter(q => q.name == e.Cliente)[0]
                e.customer_id = findCurrentName.id
            })

            data = JSON.stringify(data)
            data = JSON.parse(data)
        })

    const services_promise = await get_or_post_services(get_allRaws(data), token)

    await Promise.all(services_promise)
        .then(response => {
            console.log("Finished getting or posting the services");
            services_array = response

            data.forEach(e => {
                e.Raw.forEach(f => {
                    const findCurrentId = services_array.filter(q => q.code == f.Item_Code)[0]
                    f['service_id'] = findCurrentId.id
                })
            })

            data = JSON.stringify(data);
            data = JSON.parse(data);
        })


    const bank_promise = await get_bank(data, token)

    await Promise.all(bank_promise)
        .then(response => {
            console.log("Finished getting or posting the banks");
            response.forEach(t => {
                t.forEach(y => {
                    banks_array.push(y)
                })
                
            })
            console.log(banks_array);

            data.forEach(e => {
                const findCurrentBank = banks_array.filter(q => q.name.split(' ')[0] == e.Payment_Bank)[0]
                console.log(findCurrentBank);
                
                e['financial_account_id'] = findCurrentBank.uuid
            })

            data = JSON.stringify(data)
            data = JSON.parse(data)
        })

    const sales_promise = await post_sales(data, token)

    await Promise.all(sales_promise)
    .then(response => {
        console.log(response);
        sales_array = response;
    }).catch(err => {
        alert('One or more sales have generated an error, open the console and click OK to genereate the response body');
        console.error(err);
        sales_array = err;
    })


}

async function send_services_request_products(data, token) {
    let customer_array = []
    let products_array = []
    let banks_array = []
    let sales_array = []

    const customer_promise = await get_or_post_customers(data, token)

    await Promise.all(customer_promise)
        .then((response) => {
            console.log("Finished getting or posting the customer");
            customer_array = response

            data.forEach(e => {
                const findCurrentName = customer_array.filter(q => q.name == e.Cliente)[0]
                e.customer_id = findCurrentName.id
            })

            data = JSON.stringify(data)
            data = JSON.parse(data)
        })

    const products_promise = await get_or_post_products(get_allRaws(data), token)

    await Promise.all(products_promise)
        .then(response => {
            console.log("Finished getting or posting the products");
            products_array = response

            data.forEach(e => {
                e.Raw.forEach(f => {
                    const findCurrentId = products_array.filter(q => q.code == f.Item_Code)[0]
                    f['product_id'] = findCurrentId.id
                })
            })

            data = JSON.stringify(data);
            data = JSON.parse(data);
        })

    const bank_promise = await get_bank(data, token)

    await Promise.all(bank_promise)
        .then(response => {
            console.log("Finished getting or posting the banks");
            response.forEach(t => {
                t.forEach(y => {
                    banks_array.push(y)
                })

            })
            console.log(banks_array);

            data.forEach(e => {
                const findCurrentBank = banks_array.filter(q => q.name.split(' ')[0] == e.Payment_Bank)[0]
                console.log(findCurrentBank);

                e['financial_account_id'] = findCurrentBank.uuid
            })

            data = JSON.stringify(data)
            data = JSON.parse(data)
        })

    const sales_promise = await post_products_sales(data, token)

    await Promise.all(sales_promise)
        .then(response => {
            console.log(response);
            sales_array = response;
        }).catch(err => {
            alert('One or more sales have generated an error, open the console and click OK to genereate the response body');
            console.error(err);
            sales_array = err;
        })

}

window.addEventListener('load', (e) => {
    const currentURLParams = new URL(window.location.href).searchParams
    if (currentURLParams.get("code") === null) {
        document.getElementById('send-call').addEventListener('click', () => {
            window.location.href = url + `auth/authorize?redirect_uri=${REDIRECT_URI}&client_id=${CLIENT_ID}&scope=${SCOPE}&state=${STATE}`;
        });
    }
    else {
        async function getToken(code) {

            let response = await fetch(`https://api.contaazul.com/oauth2/token?grant_type=authorization_code&redirect_uri=${REDIRECT_URI}&code=${code}`,
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Basic ${clientIDandSecret}`,
                    },
                }
            );

            json_response = await response.json()
            console.log(json_response);
            ACESS_TOKEN = json_response['access_token'];
            REFRESH_TOKEN = json_response['refresh_token'];

            console.log(ACESS_TOKEN);

        }
        getToken(currentURLParams.get("code"))
        console.log(currentURLParams.get("code"));
    }
})

document.getElementById('send-sales-products').addEventListener('click', (e) => {
    const textarea_element = document.getElementById('table_paste').value;
    const table_itens = interpret_table(textarea_element)

    table_itens.forEach(e => {
        e['Raw'] = JSON.parse(e['Raw']);
    })
    console.log(table_itens);

    send_products_request_sales(table_itens, ACESS_TOKEN)
})

document.getElementById('send-alphaville').addEventListener('click', () => {
    const textarea_element = document.getElementById('table_paste').value;
    const table_itens = interpret_table(textarea_element)

    table_itens.forEach(e => {
        e['Raw'] = JSON.parse(e['Raw']);
    })
    console.log(table_itens);

    unique_sales(url, table_itens, ACESS_TOKEN)


})

document.getElementById('send-sales-services').addEventListener('click', (e) => {
    const textarea_element = document.getElementById('table_paste').value;
    const table_itens = interpret_table(textarea_element)

    table_itens.forEach(e => {
        e['Raw'] = JSON.parse(e['Raw']);
    })
    console.log(table_itens);

    send_services_request_sales(table_itens, ACESS_TOKEN)
})