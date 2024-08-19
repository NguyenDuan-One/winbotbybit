import { Button, TextField } from '@mui/material';
import styles from './CoinContent.module.scss'
import { useEffect, useRef, useState } from 'react';
import DataGridCustom from '../../../components/DataGridCustom';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../store/slices/Toast';
import { formatNumberString } from '../../../functions';
import { getAllCoin, syncCoin } from '../../../services/coinService';

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
            field: 'volume24h',
            headerName: 'Volume24h',
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
            const res = await getAllCoin()
            const { status, message, data: symbolListDataRes } = res.data

            const newSymbolList = symbolListDataRes.map(item => (
                {
                    id: item._id,
                    Coin: item.symbol.split("USDT")[0],
                    Symbol: item.symbol,
                    volume24h: item.volume24h,
                }))
            tableRowsDefault.current = newSymbolList
            setTableRows(newSymbolList)

        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }
    const handleSyncCoin = async () => {
        try {
            const res = await syncCoin()
            const { status, message } = res.data

            if (status === 200) {
                handleGetSymbolList()
            }
            dispatch(addMessageToast({
                status,
                message,
            }))
        }
        catch (err) {
            dispatch(addMessageToast({
                status: 500,
                message: err.message,
            }))
        }
    }


    useEffect(() => {
        handleGetSymbolList()
    }, []);
    return (
        <div className={styles.coinContent}>
            <div style={{ display: "flex", "justifyContent": "space-between", alignItems: "center" }}>
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
                <Button
                    variant='contained'
                    onClick={handleSyncCoin}>Sync</Button>
            </div>
            <DataGridCustom
                tableColumns={tableColumns}
                tableRows={tableRows}
                checkboxSelection={false}
            />
        </div>
    );
}

export default CoinContent;