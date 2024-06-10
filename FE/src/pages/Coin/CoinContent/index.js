import { TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useState } from 'react';
import DataGridCustom from '../../../components/DataGridCustom';

function CoinContent() {
    const tableColumns = [
        { field: 'Coin', headerName: 'Coin' },
        { field: 'Amount24', headerName: 'Amount24' },
    ]

    const [tableRows, setTableRows] = useState([]);

    useEffect(() => {
        setTimeout(() => {
            setTableRows([
                {
                    "id": "1000000VINU",
                    "Coin": "1000000VINU",
                    "Amount24": "286.35K"
                },
                {
                    "id": "BTC",
                    "Coin": "BTC",
                    "Amount24": "351.54M"
                },
            ])
        }, 1000)
    }, []);
    return (
        <div className={styles.coinContent}>
            <TextField
                placeholder='Search'
                size='small'
                style={{ width: "30%", marginBottom: "24px" }}
            />
            <DataGridCustom
                tableColumns={tableColumns}
                tableRows={tableRows}
                checkboxSelection={false}
            />
        </div>
    );
}

export default CoinContent;