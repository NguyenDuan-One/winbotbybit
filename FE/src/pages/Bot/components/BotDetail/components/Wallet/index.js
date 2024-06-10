
import styles from "./Overview.module.scss"
import { Button } from '@mui/material';
import { useState } from 'react';
import Transfer from './conmponents/Transfer';
import Savings from './conmponents/Savings';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';

function Wallet() {
    const [openTransfer, setOpenTransfer] = useState(false);
    const [openSavings, setOpenSavings] = useState(false);

    return (
        <div className={styles.overview}>
            <div className={styles.overviewHeader}>
                <p className={styles.text}>Balance : 0 $</p>
            </div>

            <div className={styles.overviewInfo}>
                <div className={styles.overviewInfoList}>


                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Available</p>
                        <p>0 $</p>
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Savings</p>
                        <p>0 $</p>
                    </div>

                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Spot Total</p>
                        <p>0 $</p>
                    </div>
                </div>
                <div className={styles.overviewInfoList}>


                    <div className={styles.overviewInfoListItem}>
                        <p className={styles.label}>Futures Available</p>
                        <p>0 $</p>
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
                    onClick={() => {
                        setOpenSavings(true)
                    }}
                >
                    Savings
                </Button>
            </div>

            
            <Transfer
                open={openTransfer}
                onClose={() => {
                    setOpenTransfer(false)
                }}
            />

            <Savings
                open={openSavings}
                onClose={() => {
                    setOpenSavings(false)
                }}
            />

            
        </div>
    );
}

export default Wallet;