import { TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useRef, useState } from 'react';
import DataGridCustom from '../../../components/DataGridCustom';
import { getAllSymbolWith24 } from '../../../services/dataCoinByBitService';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../store/slices/Toast';
import { formatNumberString } from '../../../functions';

function CoinContent() {
    const tableColumns = [
        {
            field: 'stt',
            headerName: '#',
            maxWidth: 50,
            type: "actions",
            renderCell: (params) => params.api.getAllRowIds().indexOf(params.id) + 1
        },
        {
            field: 'Coin',
            headerName: 'Coin',
            flex: 1,
        },
        {
            field: 'Amount24',
            headerName: 'Amount24',
            type: "number",
            flex: 1,
            renderCell: (params) => formatNumberString(params.value)
        },
    ]

    const [tableRows, setTableRows] = useState([]);

    const tableRowsDefault = useRef([])

    const dispatch = useDispatch()

    const handleGetSymbolList = async () => {
        try {
            const res = await getAllSymbolWith24()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    id: item._id,
                    Coin: item.symbol.split("USDT")[0],
                    Symbol: item.symbol,
                    Amount24: item.volume24h,
                    // Amount24: formatNumberString(item.volume24h),
                }))
            tableRowsDefault.current = newSymbolList
            setTableRows(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get All Symbol Error",
            }))
        }
    }


    useEffect(() => {
        handleGetSymbolList()
    }, []);
    return (
        <div className={styles.coinContent}>
            <TextField
                placeholder='Coin Name...'
                size='small'
                className={styles.coinInput}
                onChange={(e) => {
                    setTableRows(() => {
                        const key = e.target.value
                        if (key) {
                            const newList = tableRowsDefault.current.filter(item => item.Symbol.toUpperCase().includes(key.toUpperCase()?.trim()))
                            return newList.length > 0 ? newList : []
                        }
                        return tableRowsDefault.current
                    })
                }}
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