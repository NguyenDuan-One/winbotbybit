import { Button } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import Transfer from './conmponents/Transfer';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import styles from "./Overview.module.scss"
import { useParams } from 'react-router-dom';
import { getBotByID, updateBot } from '../../../../../../services/botService';
import { useDispatch } from 'react-redux';
import { addMessageToast } from '../../../../../../store/slices/Toast';
import { formatNumber } from '../../../../../../functions';
import { getFutureAvailable, getSpotTotal } from '../../../../../../services/dataCoinByBitService';
import CurrencyFormat from 'react-currency-format';

function Wallet() {
    const [openTransfer, setOpenTransfer] = useState(false);
    const [spotSaving, setSpotSaving] = useState(0);
    const [spotTotal, setSpotTotal] = useState(0);
    const [futureAvailable, setFutureAvailable] = useState(0);
    const futureAvailableDefault = useRef(0)
    const spotAvailable = useRef({
        dataBalance: 0,
        dataFirst: {
            spotSavings: 0,
            spotTotal: 0
        }
    })


    const { botID } = useParams()

    const dispatch = useDispatch()

    const handleGetFutureAvailable = async () => {

        try {
            const res = await getFutureAvailable(botID)
            const { status, data } = res.data

            if (status === 200) {
                const value = +data.result.list[0].totalWalletBalance
                setFutureAvailable(value)
                futureAvailableDefault.current = value
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Future Available Error",
            }))
        }
    }

    const handleGetSpotTotal = async () => {

        try {
            const res = await getSpotTotal(botID)
            const { status, data } = res.data

            const newSpotTotal = 50000
            // const newSpotTotal = +data.result.balance[0].walletBalance
            spotAvailable.current = {
                dataBalance: 0,
                dataFirst: {
                    ...spotAvailable.current.dataFirst,
                    spotTotal: newSpotTotal
                }
            }

            if (status === 200) {
                setSpotTotal(newSpotTotal)
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Get Spot Total Error",
            }))
        }
    }

    const handleGetBotSaving = () => {
        getBotByID(botID)
            .then(res => {
                const data = res.data.data;
                if (data) {
                    const newSpotSavings = +data?.spotSavings

                    spotAvailable.current = {
                        dataBalance: 0,
                        dataFirst: {
                            ...spotAvailable.current.dataFirst,
                            spotSavings: newSpotSavings
                        }
                    }

                    setSpotSaving(newSpotSavings)
                }
            }

            )
            .catch(error => {
                dispatch(addMessageToast({
                    status: 500,
                    message: "Get Bot Detail Error",
                }))
            })
    }

    const handleChangeSpotSaving = async data => {

        try {
            const res = await updateBot({
                id: botID,
                data
            })
            const { status, message } = res.data

            dispatch(addMessageToast({
                status: status,
                message: message,
            }))

            if (status === 200) {
                setSpotSaving(data?.spotSavings)
            }

        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: "Update Spot Saving Error",
            }))
        }
    }

    // Cân ví
    const handleWalletBalance = async () => {
        await handleChangeSpotSaving({
            spotSavings: spotSaving
        })
        const newSpotAvailable = spotTotal - spotSaving
        const average = (newSpotAvailable + futureAvailableDefault.current) / 2
        console.log(spotSaving);
        console.log(spotTotal);
        console.log(futureAvailableDefault.current);
        console.log(average);
        setFutureAvailable(average)
        spotAvailable.current = {
            ...spotAvailable.current,
            dataBalance: average,
        }
    }


    useEffect(() => {
        handleGetFutureAvailable()
        handleGetSpotTotal()
        handleGetBotSaving()
    }, []);

    return (
        <div className={styles.overview}>
            <div className={styles.overviewHeader}>
                <p className={styles.text}>Balance : 0 $</p>
            </div>

            <div className={styles.overviewInfo}>
                <div className={styles.overviewInfoList}>


                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Available</p>
                        <p>{formatNumber(spotAvailable.current.dataBalance || spotAvailable.current.dataFirst.spotTotal - spotAvailable.current.dataFirst.spotSavings)} $</p>
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Savings</p>

                        <CurrencyFormat
                            value={+spotSaving <= spotTotal ? spotSaving : spotTotal}
                            thousandSeparator={true}
                            prefix={'$'}
                            style={{
                                padding: "6px",
                                borderRadius: "6px",
                                outline: "none",
                                border: "1px solid #cbcbcb",
                            }}
                            onValueChange={values => {
                                const { value } = values;
                                +value <= spotTotal ? setSpotSaving(+value) : setSpotSaving(spotTotal)
                            }}
                        />
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Total</p>
                        <p>{formatNumber(spotTotal)} $</p>
                    </div>
                </div>
                <div className={styles.overviewInfoList}>


                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Futures Available</p>
                        <p>{formatNumber(futureAvailable)} $</p>
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Futures Total</p>
                        <p>0 $</p>
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Funding</p>
                        <p>0 $</p>
                    </div>
                </div>
            </div>

            <div className={styles.overviewBtnAction}>
                <Button
                    className={styles.btn}
                    size="small"
                    variant="contained"
                    startIcon={<AccountBalanceWalletIcon />}
                    onClick={() => {
                        setOpenTransfer(true)
                    }}
                >
                    Transfer
                </Button>
                <Button
                    className={styles.btn}
                    color='info'
                    size="small"
                    variant="contained"
                    startIcon={<SavingsIcon />}
                    onClick={handleWalletBalance}
                >
                    Savings
                </Button>
            </div>


            {openTransfer && <Transfer
                open={openTransfer}
                onClose={() => {
                    setOpenTransfer(false)
                }}
            />}
            {/* 
            {openSavings && <Savings
                open={openSavings}
                onClose={() => {
                    setOpenSavings(false)
                }}
            />} */}

            {/* {openEditSpotSavings &&
                <DialogCustom
                    open={true}
                    onClose={closeDialogSotSaving}
                    dialogTitle='Change Spot Saving'
                    onSubmit={handleSubmit(handleChangeSpotSaving)}
                >
                    <form className={styles.dialogForm}>
                        <FormControl style={{
                            width: "100%"
                        }}>
                            <FormLabel style={{
                                marginBottom: "6px"
                            }}>
                                Spot Savings
                            </FormLabel>
                            <TextField
                                {
                                ...register(
                                    "spotSavings",
                                    {
                                        validate: value => value <= spotTotal || "The value cannot be greater than Spot Total"
                                    })
                                }
                                type="number"
                                size="small"
                            />
                            {errors.spotSavings?.type === 'validate' && <p className="formControlErrorLabel">{errors.spotSavings.message}</p>}
                        </FormControl>
                    </form>
                </DialogCustom>
            } */}
        </div>
    );
}

export default Wallet;